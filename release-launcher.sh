#!/bin/sh

rsync -azv --chmod=a=r release/manifest.json spbh7121@109.234.164.221:api.digitalsavior.fr/public/launcher
rsync -azv --chmod=a=r release/Launcher.zip spbh7121@109.234.164.221:api.digitalsavior.fr/public/launcher
rsync -azv --chmod=a=r release/Launcher.exe spbh7121@109.234.164.221:api.digitalsavior.fr/public/launcher
rsync -azv --chmod=a=r download spbh7121@109.234.164.221:api.digitalsavior.fr/public/