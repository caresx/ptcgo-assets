import { promises as fs } from 'fs';
import { CARD_SIZES, optimize } from './lib/images';
import ora from 'ora';
import exps from 'ptcgo-dex/data/expansions.json';

export default async function() {
  const cardProcessSpinner = ora('Processing cards').start();
  await Promise.all(
    Object.keys(CARD_SIZES).flatMap(letter =>
      exps.map(async (exp: any) =>
        fs.mkdir(`./assets/card/${letter}/${exp.code}`, { recursive: true })
      )
    )
  );

  for (const { code } of exps) {
    for (const [letter, resize] of Object.entries(CARD_SIZES)) {
      cardProcessSpinner.text = `${code} ${letter.toUpperCase()}`;
      await optimize({
        inDir: `sources/card/${code}`,
        outDir: `assets/card/${letter}/${code}`,
        resize,
        formats: resize ? ['jpg', 'webp'] : ['webp'],
        sharpen: Boolean(resize),
      });
    }
  }

  cardProcessSpinner.succeed('Cards processed');
}
