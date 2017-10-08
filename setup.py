#!/usr/bin/env python
# coding: utf-8
from setuptools import setup, find_packages
from pip_github_test import __author__, __version__, __license__

setup(
        name             = 'pydcjs',
        version          = __version__,
        description      = 'Simple binding of d3.js/dc.js/crosfilter.js to python(work in Jputer notebook environment).',
        license          = __license__,
        author           = __author__,
        url              = 'https://github.com/shinesuko/pydcjs',
        packages         = find_packages(),
        install_requires = [],
        )
