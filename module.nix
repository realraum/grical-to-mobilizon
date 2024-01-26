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
      script = ''
        cd $STATE_DIRECTORY
        grical-to-mob
      '';
      serviceConfig = {
        StateDirectory = "grical-to-mob";
        User = "grical-to-mob";
        DynamicUser = true;
      };
    };
  };
}
