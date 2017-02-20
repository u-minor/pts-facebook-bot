const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const srcFiles = 'src/**/*.js';

gulp.task('build', () =>
  require('run-sequence')('clean', 'zip')
);

gulp.task('clean', done =>
  require('del')(['build/*', '!build/node_modules', 'dist/*'], done)
);

gulp.task('prepareCode', () =>
  gulp.src(srcFiles)
    .pipe(gulp.dest('build'))
);

gulp.task('preparePackages', () =>
  gulp.src('./package.json')
    .pipe(gulp.dest('build'))
    .pipe($.install({production: true}))
);

gulp.task('zip', ['prepareCode', 'preparePackages'], () =>
  gulp.src(['build/**', '!build/package.json'])
    .pipe($.zip('lambda.zip'))
    .pipe(gulp.dest('dist'))
);
