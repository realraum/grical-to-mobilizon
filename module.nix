{ config, pkgs, lib, ... }:

with lib;

let
  cfg = config.services.grical-to-mob;
in
{
  options = {
    services.grical-to-mob.enable = mkEnableOption "grical-to-mob";
  };

  config = mkIf (cfg.enable) {
    systemd.services.grical-to-mob = {
      startAt = "0 */6 * * *";
      path = with pkgs; [ grical-to-mob ];
      script = "grical-to-mob";
    };
  };
}
