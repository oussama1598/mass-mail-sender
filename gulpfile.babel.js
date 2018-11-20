

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence from 'run-sequence';
import del from 'del';

const plugins = gulpLoadPlugins();

const paths = {
  dist: 'dist',
  src: {
    scripts: ['src/**/!(*.spec|*.integration).js']
  }
};

gulp.task('clean:dist', () =>
  del([`${paths.dist}/!(.git*|Procfile)**`], {
    dot: true
  })
);

gulp.task('copy:index', () => {
  gulp
    .src('index.js')
    .pipe(
      plugins.removeCode({
        production: true
      })
    )
    .pipe(gulp.dest(paths.dist));
});

gulp.task('copy:server', () =>
  gulp
    .src(['package.json'], {
      cwdbase: true
    })
    .pipe(gulp.dest(paths.dist))
);

gulp.task('transpile:server', () =>
  gulp
    .src(paths.src.scripts)
    .pipe(plugins.sourcemaps.init())
    .pipe(
      plugins.babel({
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-runtime']
      })
    )
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest(`${paths.dist}/src`))
);

gulp.task('build', cb => {
  runSequence(
    'clean:dist',
    'transpile:server',
    'copy:server',
    'copy:index',
    cb
  );
});
