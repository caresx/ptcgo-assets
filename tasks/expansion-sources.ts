import fetch from 'node-fetch';
import { immutableDownload } from './lib/helpers';
import { promises as fs } from 'fs';
import ora from 'ora';
import exps from 'ptcgo-dex/data/expansions.json';

export default async function() {
  const expSourcesSpinner = ora('Downloading expansion sources').start();
  const expInfo = (await (await fetch('https://api.pokemontcg.io/v1/sets')).json()).sets;

  await fs.mkdir('./sources/expansion/symbol', { recursive: true });
  await fs.mkdir('./sources/expansion/logo', { recursive: true });

  for (const { code } of exps) {
    expSourcesSpinner.text = code;
    const info = expInfo.find((s: any) => s.ptcgoCode === code);
    if (!info) {
      console.warn(`Skipping image downloads for expansion ${code}`);
      continue;
    }

    await immutableDownload(info.symbolUrl, `./sources/expansion/symbol/${code}.png`);
    await immutableDownload(info.logoUrl, `./sources/expansion/logo/${code}.png`);
  }

  expSourcesSpinner.succeed('Downloaded expansion sources');
}
