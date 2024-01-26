nix-node-package: final: prev: rec {
  grical-to-mob = prev.callPackage ./. {
    mkNode = nix-node-package.lib.nix-node-package prev;
  };
}
