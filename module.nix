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
      startAt = "*-*-* */6:00:00";
      path = with pkgs; [ grical-to-mob nodejs ];
      script = ''
        export HOME=$STATE_DIRECTORY
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
