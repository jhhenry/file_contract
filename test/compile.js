const path = require('path');
const comp = require('solc_compile');
const cs = require('./compile_constants')

comp.compileContractsInFolder("../contracts/", path.dirname(cs.compiledFile));
