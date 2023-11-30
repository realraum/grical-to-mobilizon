{
  description = "Changes the brightness of the damn quadrings";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  inputs.pnpm2nix.url = "github:nzbr/pnpm2nix-nzbr/main";
  inputs.pnpm2nix.inputs.nixpkgs.follows = "nixpkgs";

  outputs = { self, nixpkgs, pnpm2nix }:

    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in

    {
      overlays.default = import ./overlay.nix;

      defaultPackage = forAllSystems (system: (import nixpkgs {
        inherit system;
        overlays = [ self.overlays.default pnpm2nix.overlays.default ];
      }).grical-to-mob);

      nixosModules = {
        grical-to-mob = import ./module.nix;
      };

    };
}
