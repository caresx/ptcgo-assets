import { promises as fs } from 'fs';
import { optimize, SIZE_EXP_SYMBOL, PACK_SIZES } from './lib/images';
import ora from 'ora';

export default async function() {
  const expProcessSpinner = ora('Processing expansions').start();

  await Promise.all(
    Object.keys(PACK_SIZES).map(async (letter: string) =>
      fs.mkdir(`./assets/expansion/pack/${letter}`, { recursive: true })
    )
  );
  await fs.mkdir('./assets/expansion/symbol', { recursive: true });
  await fs.mkdir('./assets/expansion/logo', { recursive: true });
  expProcessSpinner.text = 'Logos';
  await optimize({
    inDir: 'sources/expansion/logo',
    outDir: 'assets/expansion/logo',
    resize: {
      width: 186,
      height: 62,
      fit: 'inside',
    },
    formats: ['png', 'webp'],
  });
  expProcessSpinner.text = 'Symbols';
  // Webp is bigger than png, so symbols are png only
  await optimize({
    inDir: 'sources/expansion/symbol',
    outDir: 'assets/expansion/symbol',
    resize: SIZE_EXP_SYMBOL,
    formats: ['png'],
  });
  await optimize({
    inDir: 'external/expansion/symbol',
    outDir: 'assets/expansion/symbol',
    resize: SIZE_EXP_SYMBOL,
    formats: ['png'],
    override: true,
  });
  for (const [letter, size] of Object.entries(PACK_SIZES)) {
    expProcessSpinner.text = `Packs ${letter.toUpperCase()}`;
    await optimize({
      inDir: `external/expansion/pack`,
      outDir: `assets/expansion/pack/${letter}`,
      resize: size,
      formats: ['png', 'webp'],
    });
  }

  expProcessSpinner.succeed('Expansions processed');
}
