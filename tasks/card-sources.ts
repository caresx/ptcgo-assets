import { promises as fs } from 'fs';
import ora from 'ora';
import {
  PTCGOAssets,
  CardDefinition,
  CardDefinitionFlags,
  ItemType,
  PTCGOItem,
} from 'ptcgo-dex';
import exps from 'ptcgo-dex/data/expansions.json';
import cards from 'ptcgo-dex/data/items.json';
import ptcgoSetToExpMap from 'ptcgo-dex/data/ptcgo-set-map.json';
import { immutableDownload } from './lib/helpers';
import { invertHash, fatal } from './lib/util';

const expToPtcgoSetMap = invertHash(ptcgoSetToExpMap);

const VariantDuplicates = [
  // Xy variants that are visually equivalent (likely a different foil mask, but this is not a concern)
  'FFI/46',
  'FFI/63',
  'FFI/83',
  'AOR/54',
  'BKT/84',
  // A variants that are visually equivalent
  'UNB/76',
  'UNM/114',
];

const assets = new PTCGOAssets({ base: '' });

export default async function() {
  const cardSpinner = ora('Saving sources').start();
  await Promise.all(
    exps.map(async (exp: any) =>
      fs.mkdir(`./sources/card/${exp.code}`, { recursive: true })
    )
  );

  cardSpinner.text = `Figuring out which files need to be downloaded`;

  const cardsToProcess: { [file: string]: string } = {};
  for (const id in cards) {
    const item = new PTCGOItem<CardDefinition>(Number(id), (cards as any)[id]);
    if (!item.isCard()) continue;
    // These always have a ItemType.League variant
    if (item.itemType === ItemType.LeagueAlternate) {
      continue;
    }

    const exp = item.expansion();
    if (!exp.isValid()) {
      console.warn(`Invalid expansion`, { id, exp, item });
      continue;
    }

    cardSpinner.text = id;
    const url = sourceURL(item);
    const fileId = `${exp.code()}/${assets.itemFile(item)}`;
    const file = `sources/card/${fileId}.png`;
    if (
      file in cardsToProcess &&
      cardsToProcess[file] !== url &&
      !VariantDuplicates.includes(fileId)
    ) {
      throw fatal(
        `Overriding ${file}: ${cardsToProcess[file]} => ${url} (itemid ${item})`
      );
    }

    cardsToProcess[file] = url;
  }

  await fs.writeFile(
    './sources/card/manifest.json',
    JSON.stringify(cardsToProcess, null, 2)
  );

  let currentIndex = 0;
  const cardsToProcessArray = Object.entries(cardsToProcess);
  for (const [file, url] of cardsToProcessArray) {
    cardSpinner.text = `[${currentIndex + 1}/${cardsToProcessArray.length}] ${file}`;
    await immutableDownload(url, file);
    currentIndex += 1;
  }

  cardSpinner.succeed('Source files saved');
}

function sourceURL(item: PTCGOItem<CardDefinition>) {
  const card = item.definition!;
  const exp = item.expansion();

  let url = `https://cdn.malie.io/file/malie-io/art/cards/png/en_US/`;

  const seriesName = item
    .expansion()
    .series()
    .name();
  const ptcgoCode = expToPtcgoSetMap[exp.code()];
  // RSP is classified as its own series and also breaks the PTCGOSet-ExpansionCode rule
  if (exp.code() === 'RSP') {
    url += 'RSP/RSP/';
  } else {
    url += `${seriesName}/${ptcgoCode}-${exp.code().replace(/-/g, '_')}/`;
  }

  const discriminant = ['en_US', ptcgoCode];
  let number = card.colNo ?? String(card.no);
  // Alph Lithograph: FOUR -> Four etc.
  if (number === 'FOUR' || number === 'THREE' || number === 'TWO' || number === 'ONE') {
    number = number[0] + number.toLowerCase().slice(1);
  }

  // Pad numbers to a 3-digit number, even numbers in collection numbers, such as Radiant Collection (RC25 -> RC025), as well as RSP S15 01 -> S015 S001
  discriminant.push(number.replace(/(\d+)/g, digit => digit.padStart(3, '0')));

  discriminant.push(slugifyCardName(card.name));

  if (card.flags) {
    if (card.flags & CardDefinitionFlags.OPArt) {
      discriminant.push('op');
    } else if (card.flags & CardDefinitionFlags.XYArt) {
      discriminant.push('xy');
    } else if (card.flags & CardDefinitionFlags.YellowAArt) {
      discriminant.push('ya');
    } else if (card.flags & CardDefinitionFlags.AltArt) {
      discriminant.push('a');
    } else if (card.flags & CardDefinitionFlags.SilverArt) {
      discriminant.push('_silver');
    } else if (card.flags & CardDefinitionFlags.GoldArt) {
      discriminant.push('_gold');
    }
  } else if (item.itemType === ItemType.Language_DE) {
    discriminant.push('de');
  } else if (item.itemType === ItemType.Language_EN) {
    discriminant.push('en');
  } else if (item.itemType === ItemType.Language_ES) {
    discriminant.push('es');
  } else if (item.itemType === ItemType.Language_FR) {
    discriminant.push('fr');
  } else if (item.itemType === ItemType.Language_IT) {
    discriminant.push('it');
  } else if (item.itemType === ItemType.Language_PTBR) {
    discriminant.push('pt');
  }

  url += discriminant.join('-');
  url += '.png';
  return url;
}

function slugifyCardName(name: string) {
  return name
    .toLowerCase()
    .replace(/é/g, 'e')
    .replace(/['.()#&{}*:—?!♀♂]/g, '')
    .replace(/ {2}/g, ' ')
    .trim()
    .replace(/[- ]/g, '_');
}
