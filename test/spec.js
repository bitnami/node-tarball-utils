'use strict';

const Sandbox = require('nami-test').Sandbox;
const _ = require('lodash');
const spawnSync = require('child_process').spawnSync;
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));

const tu = require('../index.js');

/* eslint-disable no-unused-expressions */

describe('#tar()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('packs an entire directory', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''},
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1'), dest, {cwd: s.normalize('.')});
    const result = spawnSync('tar', ['-tzf', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/file\n', 'folder1/folder2/folder3/\n',
    'folder1/folder2/folder3/file\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
  });

  it('packs files relatizing to cwd', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''}
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1/folder2/folder3/file'), dest, {cwd: s.normalize('folder1/folder2')});

    expect(spawnSync('tar', ['-tzf', dest]).stdout.toString(), 'Tarball content doesn\'t fit expectations').to.be
      .eql('folder3/file\n');
  });

  it('packs folder relatizing to cwd', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''}
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1/folder2/folder3'), dest, {cwd: s.normalize('folder1/folder2')});

    expect(spawnSync('tar', ['-tzf', dest]).stdout.toString(), 'Tarball content doesn\'t fit expectations').to.be
      .eql('folder3/\nfolder3/file\n');
  });

  it('packs files relatizing to cwd', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''}
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1/folder2/folder3/file'), dest, {cwd: s.normalize('folder1/folder2')});

    expect(spawnSync('tar', ['-tzf', dest]).stdout.toString(), 'Tarball content doesn\'t fit expectations').to.be
      .eql('folder3/file\n');
  });

  it('packs folder relatizing to cwd', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''}
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1/folder2/folder3'), dest, {cwd: s.normalize('folder1/folder2')});

    expect(spawnSync('tar', ['-tzf', dest]).stdout.toString(), 'Tarball content doesn\'t fit expectations').to.be
      .eql('folder3/\nfolder3/file\n');
  });

  it('packs an entire directory including .git folder by default', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          '.git': {file: ''},
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1'), dest, {cwd: s.normalize('.')});
    const result = spawnSync('tar', ['-tzf', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/file\n', 'folder1/folder2/.git/\n',
    'folder1/folder2/.git/file\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
  });

  it('matches some items with a glob', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: '', 'file.js': ''},
          'file.js': ''
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1/**/*.js'), dest, {cwd: s.normalize('.')});
    const result = spawnSync('tar', ['-tzf', dest]).stdout.toString();
    const expectedValues = ['folder1/folder2/file.js\n', 'folder1/folder2/folder3/file.js\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
  });

  it('excludes some files', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          somefile: '',
          anotherfile: '',
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.tar.gz');

    tu.tar(s.normalize('folder1'), dest, {cwd: s.normalize('.'), exclude: ['file*', 'some*']});
    const result = spawnSync('tar', ['-tzf', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/anotherfile\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
  });

  it('disables gzip compression', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''},
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.tar');

    tu.tar(s.normalize('folder1'), dest, {cwd: s.normalize('.'), gzip: false});
    const result = spawnSync('tar', ['-tf', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/file\n',
    'folder1/folder2/folder3/\n', 'folder1/folder2/folder3/file\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
  });
});


describe('#untar()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('extracts a tarball', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.gz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-czf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.untar(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
  });

  it('excludes some files', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: '',
          somefile: '',
          anotherfile: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.gz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-czf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.untar(archive, dest, {cwd: s.normalize('.'), exclude: ['some*', 'another*']});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
    expect(path.join(dest, 'folder1/folder2/file2')).not.to.be.a.path();
    expect(path.join(dest, 'folder1/folder2/file3')).not.to.be.a.path();
  });

  it('exclude a file (using a string)', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: '',
          somefile: ''
        }
      },
      destination: {}
    });
    const dest = s.normalize('archive.tar.gz');
    tu.tar(s.normalize('folder1'), dest, {cwd: s.normalize('.'), exclude: 'somefile'});

    const result = spawnSync('tar', ['-tf', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/file\n'];
    _.each(expectedValues, value => expect(result, 'Tarball content doesn\'t fit expectations').to.contain(value));
    expect(result, 'Tarball content doesn\'t fit expectations').to.not.contain('folder1/folder2/somefile');
  });

  it('includes .git folder by default', () => {
    s.createFilesFromManifest({
      folder1: {
        '.git': {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.gz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-czf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.untar(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/.git')).to.be.a.directory();
    expect(path.join(dest, 'folder1/.git/file')).to.be.a.file();
  });

  it('strips components', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.gz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-czf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.untar(archive, dest, {cwd: s.normalize('.'), stripComponents: 1});
    expect(path.join(dest, 'folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder2/file')).to.be.a.file();
  });
});


describe('#zip()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('creates a zip file', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''},
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.zip');

    tu.zip(s.normalize('folder1'), dest, {cwd: s.normalize('.')});

    expect(spawnSync('unzip', ['-Z1', dest]).stdout.toString(), 'Zipfile content doesn\'t fit expectations').to.be
      .eql('folder1/\n');
  });

  it('recurses into directories', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          folder3: {file: ''},
          file: ''
        }
      }
    });
    const dest = s.normalize('archive.zip');

    tu.zip(s.normalize('folder1'), dest, {cwd: s.normalize('.'), recursive: true});
    const result = spawnSync('unzip', ['-Z1', dest]).stdout.toString();
    const expectedValues = ['folder1/\n', 'folder1/folder2/\n', 'folder1/folder2/file\n',
    'folder1/folder2/folder3/\n', 'folder1/folder2/folder3/file\n'];
    _.each(expectedValues, value => expect(result, 'Zipfile content doesn\'t fit expectations').to.contain(value));
  });
});


describe('#unzip()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('unzips a zip', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.zip';
    const dest = s.normalize('destination');
    spawnSync('zip', ['-r', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unzip(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
  });

  it('overrides existing directory', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: 'something'
        }
      },
      destination: {
        folder1: {
          folder2: {
            file: ''
          }
        }
      }
    });
    const archive = 'archive.zip';
    const dest = s.normalize('destination');
    spawnSync('zip', ['-r', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unzip(archive, dest, {cwd: s.normalize('.'), force: true});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
    expect(path.join(dest, 'folder1/folder2/file')).to.have.content('something');
  });
});


describe('#unpack()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('unpacks a tgz archive', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.gz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-czf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unpack(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
  });

  it('unpacks a tar.xz archive', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.tar.xz';
    const dest = s.normalize('destination');
    spawnSync('tar', ['-cJf', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unpack(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
  });

  it('unpacks a zip archive', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: ''
        }
      },
      destination: {}
    });
    const archive = 'archive.zip';
    const dest = s.normalize('destination');
    spawnSync('zip', ['-r', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unpack(archive, dest, {cwd: s.normalize('.')});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
  });

  it('overrides existing directory', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          file: 'something'
        }
      },
      destination: {
        folder1: {
          folder2: {
            file: ''
          }
        }
      }
    });
    const archive = 'archive.zip';
    const dest = s.normalize('destination');
    spawnSync('zip', ['-r', archive, 'folder1'], {cwd: s.normalize('.')});

    tu.unpack(archive, dest, {cwd: s.normalize('.'), force: true});
    expect(path.join(dest, 'folder1')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2')).to.be.a.directory();
    expect(path.join(dest, 'folder1/folder2/file')).to.be.a.file();
    expect(path.join(dest, 'folder1/folder2/file')).to.have.content('something');
  });
});


describe('#getTarballRegexp()', () => {
  it('generates a regexp for a tarball name', () => {
    expect(tu.getTarballRegexp('mytarball')).to.be.eql(/mytarball\.(tar.gz|tgz|tar.xz|zip|tar|tar|bz2|war|jar)$/m);
  });

  it('generates a regexp for a name and version', () => {
    expect(tu.getTarballRegexp('myapp', '1.0.1')).to.be
      .eql(/myapp[-_\.]*1\.0\.1\.(tar.gz|tgz|tar.xz|zip|tar|tar|bz2|war|jar)$/m);
  });
});


describe('#findTarball()', () => {
  let s = null;

  beforeEach(() => {
    s = new Sandbox();
  });

  afterEach(() => {
    s.cleanup();
  });

  it('finds a tarball using a name', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          'mytarball.tgz': ''
        }
      }
    });
    expect(tu.findTarball(s.normalize('.'), 'mytarball')).to.be.eql(s.normalize('folder1/folder2/mytarball.tgz'));
  });

  it('finds a tarball using a regexp', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          'mytarball.tgz': ''
        }
      }
    });
    expect(tu.findTarball(s.normalize('.'), /mytarball.*/)).to.be.eql(s.normalize('folder1/folder2/mytarball.tgz'));
  });

  it('finds a tarball using name and version', () => {
    s.createFilesFromManifest({
      folder1: {
        folder2: {
          'myapp-1.0.1.tgz': ''
        }
      }
    });
    expect(tu.findTarball(s.normalize('.'), {name: 'myapp', version: '1.0.1'}))
      .to.be.eql(s.normalize('folder1/folder2/myapp-1.0.1.tgz'));
  });
});
