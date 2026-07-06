local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- Enable RTL/BiDi support for Persian/Arabic (right-to-left) text
config.bidi_enabled = true
config.bidi_direction = 'AutoRTL'

return config
