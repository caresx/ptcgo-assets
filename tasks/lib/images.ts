import fg from 'fast-glob';
import sharp from 'sharp';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';
import { fileExists } from './helpers';

export const SIZE_EXP_SYMBOL = { width: 15, height: 15 };

// Guidelines for sizes chosen below, with approx 60cm viewing distance from the monitor. Use docs/sizes.html to test out a variety of cards.
// xs: Card name is readable on most cards. Pokemon cards with good contrast have their HP readable and the their typing should be discernable.
// 'Trainer', 'Item', or 'Energy' text should be readable. Based on the art it should be possible to get an idea of the card, and if the player is familiar with the card they should
// easily be able to discern it.
// s: Card name is readable (except: Triple Tag Teams, LEGEND, Team's Pokemon). Pokemon HP readable. Type, Energy costs, and attack damage readable.
// Attack name readable in most instances. Weakness, resistance, and retreat type icons readable. Card type (Trainer/Supporter/Item/Stadium/Special Energy) readable.
// 'Ability' and 'Ultra Beast' readable. Pokemon Stage readable. attack text can be read on most cards with some effort.
// m: Card body fully readable, even for long attacks. Collection number readable with some - medium (poor contrast) effort (easily readable on some cards).
// Copyright text unreadable.
// l: All text fully readable, including flavor and copyright in all instances.
// xl: 734x1024 (source quality)
// Output: JPG, WEBP. Use border radius to remove fill color visible in jpgs.
// border-radius: 4.75% / 3.5%;

export const CARD_SIZES = {
  xs: { width: 84, height: 116 },
  s: { width: 180, height: 251 },
  m: { width: 299, height: 417 },
  l: { width: 473, height: 660 },
  // No resizing
  xl: undefined,
  // PTCGO l: {width: 580, height: 809}
  // PTCGO m: {width: 410, height: 572}
  // PTCGO s: {width: 120, height: 167}
  // Pokebeach l: {width: 653, height: 911}
  // Pokebeach m: {width: 253, height: 358}
  // Pokebeach s: {width: 149, height: 200}
  // Pokebeach xs: {width: 72, height: 100}
};

// Products:
// Avatar items are 128x128
// Coins are 256x256
// Deckboxes, Packs, etc. are 512x512
// Because these images are squares with transparent padding, the width and height need to be equal.
// Output: PNG, WEBP
// border-radius not required

// xs: Art visible
// s: Expansion text visible (x additional game cards is not, but the "5" should be visible for m cards). "Prerelease" visible
// m: x additional game cards readable with effort
// l: Everything readable, high quality.
export const PACK_SIZES = {
  xs: { width: 84, height: 84 },
  s: { width: 180, height: 180 },
  m: { width: 299, height: 299 },
  l: { width: 473, height: 473 },
};

export async function optimize({
  inDir,
  outDir,
  formats,
  resize,
  sharpen = false,
  override = false,
}: {
  /** Glob, all files consumed should be .png */
  inDir: string;
  outDir: string;
  formats: Array<'jpg' | 'png' | 'webp'>;
  resize?: { width: number; height: number; fit?: string; background?: object };
  sharpen?: boolean;
  override?: boolean;
}) {
  const files = await fg(`./${inDir}/*.png`);
  await Promise.all([
    ...files.map(async (file: any) => {
      const fileId = path.basename(file, '.png');
      let img = sharp(file);

      if (resize) {
        img = img.resize(resize as any);
      }

      // Remove alpha layer
      if (formats.includes('jpg') || (formats.length === 1 && formats[0] === 'webp')) {
        img = img.flatten({ background: '#FFE164' });
      }

      return Promise.all(
        formats.map(async ext => {
          const out = `./${outDir}/${fileId}.${ext}`;
          if (!override && (await fileExists(out))) return;
          let formattedImg = applyFormat(img.clone(), ext, sharpen);

          if (ext === 'png') {
            formattedImg = sharp(
              await imageminPngquant({ quality: [0.3, 0.6], dithering: false })(
                await formattedImg.toBuffer({ resolveWithObject: false })
              )
            );
          }

          // Random errors will occur with the file system when doing this highly parallel like this.
          // We can continue the process and look at broken files manually, delete them, and redo them later.
          try {
            await formattedImg.toFile(out);
          } catch (err1) {
            console.info(`Retrying saving ${out}`);
            try {
              await formattedImg.toFile(out);
            } catch (err2) {
              console.error('File error', { out, err1, err2 });
            }
          }
        })
      );
    }),
  ]);
}

// We try to make the png & jpg as small as possible in order to cut down on total file size. Otherwise wayyy too much storage will be consumed.
// Most browsers should be consuming webp.
// https://caniuse.com/#search=webp Edge, Chroium, Opera, Android Browsers
function applyFormat(img: sharp.Sharp, ext: string, sharpen: any) {
  if (ext === 'png') {
    // https://sharp.pixelplumbing.com/api-output#png PNG compression by sharp is very poor, so we have to run pngquant on top of it
    img = img.png();
  } else if (ext === 'jpg') {
    // https://sharp.pixelplumbing.com/api-output#jpeg
    img = img.jpeg({
      quality: 50,
      chromaSubsampling: '4:4:4',
      trellisQuantisation: true,
      overshootDeringing: true,
    });
  } else if (ext === 'webp') {
    // https://sharp.pixelplumbing.com/api-output#webp
    // Sharpening greatly improves image quality at a slight gain to file size. Lowering the quality + sharpening results in a better image,
    // due to the text-heaviness of cards.
    const webpOptions: any = {
      smartSubsample: true,
      reductionEffort: 6,
      quality: sharpen ? 60 : 70,
      alphaQuality: 30,
    };
    if (sharpen) img = img.sharpen();
    img = img.webp(webpOptions);
  }

  return img;
}
