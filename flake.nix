{
  description = "Changes the brightness of the damn quadrings";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  inputs.nix-node-package.url = "github:mkg20001/nix-node-package/master";

  outputs = { self, nixpkgs, nix-node-package }:

    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in

    {
      overlays.default = import ./overlay.nix nix-node-package;

      defaultPackage = forAllSystems (system: (import nixpkgs {
        inherit system;
        overlays = [ self.overlays.default ];
      }).grical-to-mob);

      nixosModules = {
        grical-to-mob = import ./module.nix;
      };

    };
}
