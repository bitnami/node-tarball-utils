'use strict';

const _ = require('lodash');
const runProgram = require('nami-utils').os.runProgram;
const fs = require('fs-extra');
const path = require('path');
const nfile = require('nami-utils').file;
const find = require('common-utils').find;

/**
 * Create tar file
 * @param  {string|string[]} dir - Glob expression (or array of them) for aim directory
 * @param  {string} tarFile - Target tar file
 * @param  {Object} [options]
 * @param  {string} [options.cwd=null] - Directory where the command is executed
 * @param  {boolean} [options.gzip=true] - Apply gzip compression
 * @param  {string[]} [options.exclude=[]] - Files to exclude in the tarball
 * @param  {string[]} [options.logger=null] - If provided, the output will be logged using this logger
 */
function tar(dir, tarFile, options) {
  options = _.defaults({}, options, {cwd: null, gzip: true, mode: 'c', exclude: [], logger: null});
  options.exclude = _.isArray(options.exclude) ? options.exclude : [options.exclude];

  let files = nfile.glob(dir);
  if (options.cwd) {
    files = _.map(files, f => {
      return _.startsWith(f, options.cwd) ? nfile.relativize(f, options.cwd) : f;
    });
    options.exclude = _.map(options.exclude, f => nfile.relativize(f, options.cwd));
  }

  let flags = '-';
  flags += options.mode;
  if (options.gzip) flags += 'z';
  flags += 'f';

  let tarOpts = [];

  if (options.cwd) {
    tarOpts.push('-C', options.cwd);
  }

  _.each(options.exclude, function(p) {
    tarOpts.push(`--exclude=${p}`);
  });

  tarOpts.push(flags);
  tarOpts.push(tarFile);
  tarOpts = tarOpts.concat(files);

  runProgram('tar', tarOpts, options);
}


/**
 * Extract tar file
 * @param  {string} tarFile - Tar file to extract
 * @param  {string} destination - Destination directory
 * @param  {Object} [options]
 * @param  {string[]} [options.exclude=[]] - Files to exclude in the extraction
 * @param  {string[]} [options.stripComponents=0] - Number of directory folders to strip
 */
function untar(tarFile, destination, options) {
  options = _.defaults({}, options, {exclude: [], stripComponents: 0});
  let tarOpts = [];

  _.each(options.exclude, f => tarOpts.push(`--exclude=${f}`));

  if (options.stripComponents > 0) tarOpts.push(`--strip-components=${options.stripComponents}`);

  tarOpts = tarOpts.concat(['-C', destination, '-xf', tarFile]);

  runProgram('tar', tarOpts, options);
}


/**
 * Create zip file
 * @param  {string} source - Source files for the zip (it accepts glob format)
 * @param  {string} destination - Target zip file
 * @param  {Object} [options]
 * @param  {string} [options.cwd=null] - Directory where the command is executed
 * @param  {string} [options.recursive=false] - Recurse into directories
 */
function zip(source, destination, options) {
  options = _.defaults({}, options, {cwd: null, recursive: false});


  let files = nfile.glob(source);
  if (options.cwd && _.startsWith(source, options.cwd)) {
    files = _.map(files, f => nfile.relativize(f, options.cwd));
  }

  const zipOpts = [destination].concat(files);
  if (options.recursive) zipOpts.unshift('-r');
  runProgram('zip', zipOpts, options);
}


/**
 * Extract zip file
 * @param  {string} zipFile - Zip file to extract
 * @param  {string} destination - Directory where to extract the files
 * @param  {Object} [options]
 * @param  {boolean} [options.force=false] - Override output if exists
 */
function unzip(zipFile, destination, options) {
  options = _.defaults({}, options, {force: false});

  const unzipOpts = ['-q', zipFile, '-d', destination];

  if (options.force) unzipOpts.unshift('-o');

  runProgram('unzip', unzipOpts, options);
}


function _unpack(file, destination, options) {
  nfile.mkdir(destination);
  let compression = null;
  _.each({
    tgz: ['.tar.gz', '.tgz', '.tar.xz'],
    zip: ['.zip', '.war', '.jar']
  }, function(extensions, compressionType) {
    if (_.some(extensions, extension => _.endsWith(file, extension))) {
      compression = compressionType;
      return false;
    }
  });
  switch (compression) {
    case 'tgz':
      untar(file, destination, options);
      break;
    case 'zip':
      unzip(file, destination, options);
      break;
    default:
      throw new Error(`Don't know how to unpack '${file}'`);
  }
}


function _getUniqueFile(file) {
  let testFile = file;
  let i = 0;
  while (nfile.exists(testFile)) {
    i += 1;
    testFile = `${file}${i}`;
  }
  return testFile;
}


/**
 * Unpack an archive (tgz, zip, war, jar)
 * @param  {string} file - Path to the archive
 * @param  {string} destination - Directory where to extract the files
 * @param  {Object} [options]
 * @param  {boolean} [options.force=false] - Override output if exists
 * @param  {boolean} [options.reRoot=false] - Strip one component if the archive contains just one element
 * (file or directory)
 */
function unpack(file, destination, options) {
  options = _.defaults({}, options, {reRoot: false, force: false});
  if (options.reRoot) {
    if (nfile.exists(destination)) {
      if (options.force) {
        nfile.delete(destination);
      } else {
        throw new Error(`Destination ${destination} already exists. ` +
          'If you want to user reRoot over it, delete it first or force');
      }
    }
    const tmpDest = _getUniqueFile(`${destination.replace(/\/*$/, '')}.tmp`);
    _unpack(file, tmpDest, options);
    const contents = fs.readdirSync(tmpDest);
    if (contents.length === 1) {
      nfile.rename(path.join(tmpDest, contents[0]), destination);
      nfile.delete(tmpDest);
    } else {
      nfile.rename(tmpDest, destination);
    }
  } else {
    return _unpack(file, destination, options);
  }
}


function _escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Build a regexp for a tarball matching certain parameters
 * @name getTarballRegexp
 * @param  {string} tarballName - Name of ther tarball without the extension
 * @return {regexp}
 */
 /**
  * Build a regexp for a tarball matching certain parameters
  * @name getTarballRegexp^2
  * @param  {string} name - Name of the component
  * @param  {string} version - Version of the component
  * @return {regexp}
  */
function getTarballRegexp(name, version) {
  let tarballName = null;
  if (_.isUndefined(version)) {
    tarballName = name;
    name = null;
  }

  /* eslint-disable no-useless-escape */
  const tarballExtenssions = ['tar\.gz', 'tgz', 'tar\.xz', 'zip', 'tar', 'tar', 'bz2', 'war', 'jar'];
  const separators = ['-', '_', '\.'];
  /* eslint-enable no-useless-escape */

  if (!_.isEmpty(tarballName)) {
    return _.find(tarballExtenssions, ext => _.endsWith(tarballName, ext)) ?
      new RegExp(_escapeRegExp(tarballName)) :
      new RegExp(`${_escapeRegExp(tarballName)}\\.\(${tarballExtenssions.join('|')}\)$`, 'm');
  } else if (!_.isEmpty(name) && !_.isEmpty(version)) {
    // Pattern for multiple combinations of joining plus extenssions
    let regexpStr = _escapeRegExp(name);
    regexpStr += `\[${_escapeRegExp(separators.join(''))}\]*`;
    regexpStr += _escapeRegExp(version);
    regexpStr += `\\.\(${tarballExtenssions.join('|')}\)$`;
    return new RegExp(regexpStr, 'm');
  } else {
    throw new Error('You should at least specify name and version or the tarballName');
  }
}


/**
 * Find a tarball that fulfills some terms.
 * @param  {string|string[]} directories - List of directories where to look for tarballs
 * @param  {string|regexp|Object} searchTerm  - Terms for the tarballs. If it is an object with properties name and
 * version they will be used for matching the name of the tarball.
 * If it is a regexp it will perform a simple search.
 * If it is a string it will try to match a tarball with that name.
 * @param  {Object} [options]
 * @param  {boolean} [options.findAll=false] - Search for all the ocurrences.
 * @param  {string} [options.cacheFile=null] - Apart from the directories, search inside a file with paths (one
 * line per path).
 * @return {array|string} - Path of the item found or an array of them if {@linkcode options.findAll} is true
 * @throws {Error} - If no item found
 */
function findTarball(directories, searchTerm, options) {
  // If it is just a plain search, pass that to find
  if (_.isRegExp(searchTerm)) {
    return find(directories, searchTerm, options);
  }

  const tarballRegex = _.isString(searchTerm) ?
    getTarballRegexp(searchTerm) :
    getTarballRegexp(searchTerm.name, searchTerm.version);

  return find(directories, tarballRegex, options);
}


module.exports = {
  tar,
  untar,
  unzip,
  zip,
  unpack,
  getTarballRegexp,
  findTarball
};
