import gulp from 'gulp';
import consola from 'consola';

consola.wrapConsole();

for (const task of [
  'card-sources',
  'expansion-sources',
  'card-process',
  'expansion-process',
]) {
  gulp.task(task, require(`./tasks/${task}`).default);
}

gulp.task('sources', gulp.parallel('card-sources', 'expansion-sources'));
gulp.task('process', gulp.parallel('card-process', 'expansion-process'));
gulp.task(
  'assets',
  gulp.parallel(
    gulp.series('card-sources', 'card-process'),
    gulp.series('expansion-sources', 'expansion-process')
  )
);
