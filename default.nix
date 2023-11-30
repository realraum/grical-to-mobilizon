{ lib
, mkPnpmPackage
, fetchFromGitHub
, makeWrapper
, nodejs
}:

mkPnpmPackage rec {
  name = "grical-to-mob";

  src = ./.;

  distDir = ".gitignore";

  nativeBuildInputs = [
    makeWrapper
  ];

  postInstall = ''
    rm -rf $out
    cp -r $PWD $out
    ls $out
    makeWrapper ${nodejs.pkgs.pnpm} $out/bin/grical-to-mob \
      --cwd $out \
      --arg "start"
  '';
}
