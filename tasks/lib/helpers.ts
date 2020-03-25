import https from 'https';
import fs from 'fs';

export async function immutableDownload(url: string, dest: string) {
  return new Promise((resolve, reject) => {
    fs.access(dest, fs.constants.F_OK, err => {
      if (!err) {
        console.log(`File exists`, { url, dest });
        resolve(); // File already exists
        return;
      }

      const file = fs.createWriteStream(dest);
      https
        .get(url, response => {
          if (response.statusCode !== 200) {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw response;
          }

          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', async err => {
          try {
            await fs.promises.unlink(dest);
          } catch {}

          reject(err);
        });
    });
  });
}

export async function fileExists(file: string) {
  return fs.promises.access(`./${file}`, fs.constants.F_OK).catch(() => false);
}
