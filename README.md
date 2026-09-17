![AmpMatrix Card](assets/ampmatrix-banner.png)

**A compact hi-fi amplifier card for Home Assistant.**

Neutral surfaces, a champagne volume scale and an orange segmented LCD and cassette-style SOURCE/EQ keys.

## Project Status

| Field | Current state |
|---|---|
| Maturity | Experimental |
| Used in my homelab | User testing in progress |
| Recommended for production | Not yet |
| Setup difficulty | Intermediate |
| Documentation | Installation, configuration and development |
| Current version | 0.2.0 |
| Distribution | HACS custom repository |

> [!WARNING]
> This project is experimental. Automated tests use simulated entities. Early user
> testing is in progress; this version still needs live-device confirmation.

## Why It Exists

A focused amplifier front panel with direct volume, source and sound preset controls.

## Interface

| Light | Dark |
|---|---|
| ![Light](assets/light.png) | ![Dark](assets/dark.png) |

These are screenshots of the implemented card with simulated data.

- Press the knob to turn the amplifier on or off. Its indicator is red when on
  and neutral when off, and follows the volume position.
- Drag upward/downward on the knob to increase/decrease volume. Releasing a drag
  never toggles power. Arrow keys adjust volume; Enter/Space toggle power.
- Use −/+ or arrow keys for native `volume_up/down` steps when supported.
  Otherwise use `volume_set` with `volume_step` (default 1%).
- The orange LCD shows the reported source, including Airplay when it is not
  selectable. Bold segments retain faint inactive segments. When volume changes,
  it shows `VOL 34` (no percent sign) for two seconds, then returns to the source.
  This also follows external volume updates. It shows OFF when powered down.
- Two equal-width SOURCE and EQ keys open temporary selectors, populated from
  `source_list` and `sound_mode_list`. An unlisted current source can be displayed
  but cannot be selected. Escape or × closes the selector.
- The larger red knob LED indicates confirmed power state. Unknown/unavailable
  state shows `--` and disables commands.
- Commands and LED state follow the entity's supported features and reported state.
  Unavailable entities cannot receive commands. Service failures display an error.
- No metadata display, artwork, playback controls or embedded credentials.

## Installation and configuration

The standalone JavaScript module is `dist/ampmatrix-card.js`. It has no runtime
package dependencies and uses Home Assistant's existing service interface.
### HACS

Add `https://github.com/issu-lab/ampmatrix-card` under **HACS → Custom repositories**,
select **Dashboard**, then download AmpMatrix Card and refresh the browser.
It is a custom repository, not part of the default HACS catalog.

If necessary, register `/hacsfiles/ampmatrix-card/ampmatrix-card.js` as a JavaScript
module dashboard resource.

### Manual

Download `ampmatrix-card.js` from the [latest release](https://github.com/issu-lab/ampmatrix-card/releases/latest).
Copy it to `www/ampmatrix-card.js`, register `/local/ampmatrix-card.js` as a
JavaScript module dashboard resource, then configure:

```yaml
type: custom:ampmatrix-card
entity: media_player.living_room
color_mode: auto
language: auto
volume_step: 0.01
```

`color_mode`: auto/light/dark. `language`: auto/en/it. `volume_step`: >0 and ≤0.1.
A basic visual editor offers the entity and color mode. Other settings use YAML.
The entity must declare turn_on/turn_off, volume_set or volume_step,
select_source and select_sound_mode for the corresponding controls.
`volume_step` is used only as a fallback when native stepping is unavailable;
it requires volume_set and a numeric volume_level.

## Development and validation

```sh
node build.mjs
node tests/browser.mjs
```

The test requires Playwright and an installed Chromium executable. Set
`PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH` for externally installed tools.
The browser test intercepts preview requests and serves local files: no HTTP
server or Home Assistant connection is needed. `index.html` is a local simulator.

Validation covers power, off-state guards, volume precision, source and EQ commands,
drag/click separation, keyboard, unavailable entities, missing feature flags,
service errors, escaped source labels, updates during a held click, LCD timers,
external volume changes, screenshots and mobile overflow/touch targets.
Test service payloads target only `media_player.demo`.

## Limits and next steps

- Live confirmation of the 0.2.0 fixes, WebKit and physical mobile testing remain pending.
- The segmented LCD supports Latin letters, digits and dashes. Other characters
  appear as dashes; the accessible label retains the original source. Long labels
  shrink to fit, with a 32-character visual limit.
- The rendered face is 2:1. EQ and service errors may add temporary content.
- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md).

## License

[MIT](LICENSE).

---

<div align="center">

This project is part of the **iSSU Open Homelab ecosystem**.

<a href="https://github.com/issu-lab/Open-Homelab">
  <img src="https://raw.githubusercontent.com/issu-lab/ampmatrix-card/main/assets/issu-open-homelab-badge.png"
       alt="Explore iSSU Open Homelab"
       width="480">
</a>

</div>
