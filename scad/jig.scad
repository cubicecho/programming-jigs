// Pogo-pin programming jig (parametric).
//
// The jig is a block with one hole per pogo pin. The pins point down out of
// the bottom face onto the target (chip leads, module pads or test points),
// and wires are soldered to the barrel tails sticking out of the top.
//
// Coordinates are a top view of the target: X to the right, Y up, and the
// origin at the centre of the pin layout. Pin 1 is top-left and numbering runs
// counter-clockwise, as on a chip seen from above.
//
// Opens in desktop OpenSCAD with the Customizer. The web generator sets the
// same variables, so a .scad saved from it opens here with your values.

/* [Layout] */
// How the pins are arranged
layout = "dual"; // [grid:Grid (headers / test pads), dual:Two rows (DIP / SOIC / modules), quad:Four sides (QFP / QFN), custom:Custom point list]
// Distance between neighbouring pins in a row (mm)
pitch = 2.0; // [0.4:0.01:5.08]
// Grid: pins per row
grid_cols = 4; // [1:1:40]
// Grid: number of rows
grid_rows = 1; // [1:1:10]
// Grid: distance between rows (mm)
grid_row_pitch = 2.54; // [0.5:0.01:20]
// Two rows: pins on each side
pins_per_side = 8; // [1:1:40]
// Two rows: centre-to-centre distance between the rows (mm)
row_span = 16.0; // [1:0.01:60]
// Four sides: pins on the left and right sides
quad_pins_y = 12; // [1:1:50]
// Four sides: pins on the top and bottom sides
quad_pins_x = 12; // [1:1:50]
// Four sides: distance between the left and right rows (mm)
quad_span_x = 8.4; // [1:0.01:60]
// Four sides: distance between the top and bottom rows (mm)
quad_span_y = 8.4; // [1:0.01:60]
// Custom: pin positions [[x, y], ...] in mm, numbered in list order
custom_pins = [[0, 0], [2.54, 0]];
// Pin numbers to leave out, e.g. [2, 5]
skip_pins = [];
// Mirror left-right, for probing from the underside of the board
view_from_bottom = false;

/* [Pogo pin] */
// Barrel (body) diameter of the pogo pin (mm)
pin_barrel_d = 1.0; // [0.3:0.01:3]
// Barrel length (mm)
pin_barrel_len = 18.5; // [3:0.1:50]
// Overall pin length, plunger included (mm)
pin_total_len = 24; // [3:0.1:60]
// Added to the barrel diameter for a sliding fit (mm)
hole_clearance = 0.15; // [0:0.01:0.5]
// Length of a tighter grip section at the top of each hole (0 = none)
grip_len = 2; // [0:0.1:10]
// Added to the barrel diameter in the grip section (mm)
grip_clearance = 0.0; // [-0.2:0.01:0.5]
// Narrow the bottom of each hole so the barrel can't slide through
pin_stop = true;
// Thickness of the stop ledge (mm)
stop_len = 1.0; // [0.2:0.1:5]
// Hole diameter through the stop: passes the plunger, not the barrel (mm)
stop_hole_d = 0.8; // [0.2:0.01:3]
// Chamfer at the top of each hole to guide pins in (mm)
entry_chamfer = 0.3; // [0:0.05:1]

/* [Board contact] */
// Raise the pin seats so the bottom face sits flat on the board (needs the pin stop)
sit_on_board = false;
// How far the pins are pushed in when the jig sits flat; keep it under the pin's travel (mm)
preload = 1.0; // [0.1:0.1:5]

/* [Body] */
// Height of the jig block (mm)
body_height = 12; // [2:0.5:40]
// Material around the outermost pins (mm)
margin = 2; // [0.5:0.1:20]
// Minimum body width, X (0 = fit to the pins)
min_body_x = 0; // [0:0.5:200]
// Minimum body depth, Y (0 = fit to the pins)
min_body_y = 0; // [0:0.5:200]
// Corner rounding (mm)
corner_radius = 1; // [0:0.1:10]
// Chamfer the body corner nearest pin 1
pin1_marker = true;

/* [Locator] */
// Cut a pocket in the bottom that fits over the chip or module body
pocket = false;
// Pocket width, X (mm)
pocket_x = 3.9; // [0.5:0.1:100]
// Pocket depth, Y (mm)
pocket_y = 4.9; // [0.5:0.1:100]
// Pocket height (mm)
pocket_depth = 1.0; // [0.1:0.1:20]
// Extra room around the pocket on each side (mm)
pocket_clearance = 0.2; // [0:0.05:2]
// Alignment pegs that drop into PCB holes: [[x, y, diameter, length], ...]
pegs = [];

/* [Clamp tab] */
// Add a flat tab off the body, level with its bottom face, to clamp the jig to the board
clamp_tab = false;
// Which side the tab comes off, in the top view
clamp_tab_side = "right"; // [right:Right, left:Left, top:Top, bottom:Bottom, left_right:Left and right, top_bottom:Top and bottom]
// How far the tab sticks out from the body (mm)
clamp_tab_length = 15; // [3:0.5:80]
// Tab width along the body edge (0 = same as the body)
clamp_tab_width = 10; // [0:0.5:100]
// Tab thickness (mm)
clamp_tab_thickness = 3; // [1:0.1:10]
// Screw or zip-tie hole through the middle of the tab (0 = none)
clamp_tab_hole_d = 0; // [0:0.1:10]

/* [Output] */
// Turn the jig upside down for printing (better with a pocket or pegs)
flip_for_printing = false;

/* [Hidden] */
$fa = 6;
$fs = 0.15;
eps = 0.01;

// ---------------------------------------------------------------- layout --

function centred(i, n, step) = (i - (n - 1) / 2) * step;

function grid_layout() = [
  for (c = [0:1:grid_cols - 1]) for (r = [0:1:grid_rows - 1])
    [c * grid_rows + r + 1, centred(c, grid_cols, pitch), -centred(r, grid_rows, grid_row_pitch)]
];

function dual_layout() = let(n = pins_per_side) concat(
  [for (i = [0:1:n - 1]) [i + 1, -row_span / 2, -centred(i, n, pitch)]],
  [for (i = [0:1:n - 1]) [n + i + 1, row_span / 2, centred(i, n, pitch)]]
);

function quad_layout() = let(ny = quad_pins_y, nx = quad_pins_x) concat(
  [for (i = [0:1:ny - 1]) [i + 1, -quad_span_x / 2, -centred(i, ny, pitch)]],
  [for (i = [0:1:nx - 1]) [ny + i + 1, centred(i, nx, pitch), -quad_span_y / 2]],
  [for (i = [0:1:ny - 1]) [ny + nx + i + 1, quad_span_x / 2, centred(i, ny, pitch)]],
  [for (i = [0:1:nx - 1]) [2 * ny + nx + i + 1, -centred(i, nx, pitch), quad_span_y / 2]]
);

function custom_layout() = [for (i = [0:1:len(custom_pins) - 1]) [i + 1, custom_pins[i][0], custom_pins[i][1]]];

function raw_layout() =
  layout == "grid" ? grid_layout()
  : layout == "quad" ? quad_layout()
  : layout == "custom" ? custom_layout()
  : dual_layout();

function contains(list, v) = len([for (x = list) if (x == v) 1]) > 0;

mx = view_from_bottom ? -1 : 1;

// Every pin as [number, x, y, used]; skipped pins keep their number.
all_pins = [for (p = raw_layout()) [p[0], mx * p[1], p[2], contains(skip_pins, p[0]) ? 0 : 1]];
used_pins = [for (p = all_pins) if (p[3] == 1) p];

// ------------------------------------------------------------------ body --

function min_of(v) = min([for (x = v) x]);
function max_of(v) = max([for (x = v) x]);

pin_xs = [for (p = all_pins) p[1]];
pin_ys = [for (p = all_pins) p[2]];
// The pocket and pocket-relative maths are centred on the pin layout.
lay_cx = len(all_pins) > 0 ? (min_of(pin_xs) + max_of(pin_xs)) / 2 : 0;
lay_cy = len(all_pins) > 0 ? (min_of(pin_ys) + max_of(pin_ys)) / 2 : 0;

pocket_hx = pocket ? pocket_x / 2 + pocket_clearance : 0;
pocket_hy = pocket ? pocket_y / 2 + pocket_clearance : 0;

// Everything the body must cover, as [x, y] points.
cover = concat(
  [for (p = all_pins) [p[1], p[2]]],
  pocket ? [[lay_cx - pocket_hx, lay_cy - pocket_hy], [lay_cx + pocket_hx, lay_cy + pocket_hy]] : [],
  [for (g = pegs) each [[mx * g[0] - g[2] / 2, g[1] - g[2] / 2], [mx * g[0] + g[2] / 2, g[1] + g[2] / 2]]]
);
cover_x = [for (c = cover) c[0]];
cover_y = [for (c = cover) c[1]];
body_cx = len(cover) > 0 ? (min_of(cover_x) + max_of(cover_x)) / 2 : 0;
body_cy = len(cover) > 0 ? (min_of(cover_y) + max_of(cover_y)) / 2 : 0;
body_x = max(min_body_x, (len(cover) > 0 ? max_of(cover_x) - min_of(cover_x) : 0) + 2 * margin);
body_y = max(min_body_y, (len(cover) > 0 ? max_of(cover_y) - min_of(cover_y) : 0) + 2 * margin);

function in_pocket(x, y) = pocket && abs(x - lay_cx) <= pocket_hx && abs(y - lay_cy) <= pocket_hy;
// Height of the face a pin exits from: the pocket roof or the bottom face.
function hole_base(x, y) = in_pocket(x, y) ? pocket_depth : 0;

hole_d = pin_barrel_d + hole_clearance;
grip_d = pin_barrel_d + grip_clearance;
stop_h = pin_stop ? stop_len : 0;
// Uncompressed length of plunger and tip below the barrel.
free_tip = pin_total_len - pin_barrel_len;
// Height of the stop ledge above the face a pin exits from. Raising it lets
// the body sit on the board with the pins pushed in by `preload`.
standoff = sit_on_board && pin_stop ? max(0, free_tip - stop_h - preload) : 0;

// ------------------------------------------------------------- clamp tab --

function tab_sides() =
  !clamp_tab ? []
  : clamp_tab_side == "left_right" ? ["left", "right"]
  : clamp_tab_side == "top_bottom" ? ["top", "bottom"]
  : [clamp_tab_side];

// Tab footprint as [x0, y0, x1, y1]. It reaches into the body past the
// rounded corners so the two fuse.
function tab_rect(side) = let(
  L = clamp_tab_length,
  ov = max(corner_radius, 0.5),
  wy = clamp_tab_width > 0 ? clamp_tab_width : body_y,
  wx = clamp_tab_width > 0 ? clamp_tab_width : body_x,
  x0 = body_cx - body_x / 2, x1 = body_cx + body_x / 2,
  y0 = body_cy - body_y / 2, y1 = body_cy + body_y / 2
)
  side == "left" ? [x0 - L, body_cy - wy / 2, x0 + ov, body_cy + wy / 2]
  : side == "top" ? [body_cx - wx / 2, y1 - ov, body_cx + wx / 2, y1 + L]
  : side == "bottom" ? [body_cx - wx / 2, y0 - L, body_cx + wx / 2, y0 + ov]
  : [x1 - ov, body_cy - wy / 2, x1 + L, body_cy + wy / 2];

// Centre of the part of the tab outside the body, for the screw hole.
function tab_hole_at(side) = let(r = tab_rect(side))
  side == "left" ? [(r[0] + body_cx - body_x / 2) / 2, (r[1] + r[3]) / 2]
  : side == "right" ? [(r[2] + body_cx + body_x / 2) / 2, (r[1] + r[3]) / 2]
  : side == "top" ? [(r[0] + r[2]) / 2, (r[3] + body_cy + body_y / 2) / 2]
  : [(r[0] + r[2]) / 2, (r[1] + body_cy - body_y / 2) / 2];

module clamp_tab(side) {
  r = tab_rect(side);
  w = r[2] - r[0];
  h = r[3] - r[1];
  rr = min(corner_radius, w / 2 - eps, h / 2 - eps);
  difference() {
    linear_extrude(min(clamp_tab_thickness, body_height))
      translate([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2])
        if (rr > 0) offset(r = rr) square([w - 2 * rr, h - 2 * rr], center = true);
        else square([w, h], center = true);
    if (clamp_tab_hole_d > 0) translate([each tab_hole_at(side), -1]) cylinder(d = clamp_tab_hole_d, h = body_height + 2);
  }
}

module body_outline() {
  r = min(corner_radius, body_x / 2 - eps, body_y / 2 - eps);
  translate([body_cx, body_cy])
    if (r > 0) offset(r = r) square([body_x - 2 * r, body_y - 2 * r], center = true);
    else square([body_x, body_y], center = true);
}

// Triangle that cuts the corner nearest pin 1.
module pin1_cut() {
  p1 = all_pins[0];
  sx = p1[1] >= body_cx ? 1 : -1;
  sy = p1[2] >= body_cy ? 1 : -1;
  kx = body_cx + sx * body_x / 2;
  ky = body_cy + sy * body_y / 2;
  c = min(margin * 0.8, 2.5);
  translate([0, 0, -1]) linear_extrude(body_height + 2) polygon([
    [kx - sx * (c + 1), ky + sy * 1],
    [kx + sx * 1, ky - sy * (c + 1)],
    [kx + sx * 2, ky + sy * 2],
  ]);
}

module pin_hole(base) {
  top = body_height;
  seat = base + standoff + stop_h;
  grip = max(0, min(grip_len, top - seat));
  // Clear channel for the plunger below a raised stop.
  if (standoff > 0) translate([0, 0, base - 1]) cylinder(d = hole_d, h = 1 + standoff + eps);
  // Stop ledge (or a plain hole when there is no stop).
  ledge_z = standoff > 0 ? base + standoff : base - 1;
  translate([0, 0, ledge_z]) cylinder(d = pin_stop ? stop_hole_d : hole_d, h = seat - ledge_z + eps);
  // Sliding section.
  translate([0, 0, seat]) cylinder(d = hole_d, h = top - seat - grip + eps);
  // Grip section and entry chamfer.
  if (grip > 0) translate([0, 0, top - grip]) cylinder(d = grip_d, h = grip + 1);
  if (entry_chamfer > 0) {
    d0 = grip > 0 ? grip_d : hole_d;
    translate([0, 0, top - entry_chamfer]) cylinder(d1 = d0, d2 = d0 + 2 * entry_chamfer, h = entry_chamfer + eps);
    translate([0, 0, top]) cylinder(d = d0 + 2 * entry_chamfer, h = 1);
  }
}

module peg(d, l) {
  tip = min(d / 3, l / 2);
  translate([0, 0, -l]) {
    translate([0, 0, tip]) cylinder(d = d, h = l - tip + 0.5);
    cylinder(d1 = d - 2 * tip, d2 = d, h = tip + eps);
  }
}

module jig() {
  difference() {
    union() {
      difference() {
        linear_extrude(body_height) body_outline();
        if (pin1_marker && len(all_pins) > 0) pin1_cut();
      }
      for (side = tab_sides()) clamp_tab(side);
      for (g = pegs) translate([mx * g[0], g[1], 0]) peg(g[2], g[3]);
    }
    for (p = used_pins) translate([p[1], p[2], 0]) pin_hole(hole_base(p[1], p[2]));
    if (pocket) translate([lay_cx - pocket_hx, lay_cy - pocket_hy, -1])
      cube([2 * pocket_hx, 2 * pocket_hy, pocket_depth + 1]);
  }
}

if (flip_for_printing) translate([0, 0, body_height]) rotate([180, 0, 0]) jig();
else jig();

// Machine-readable summary for the web generator.
echo("JIG_PINS", all_pins);
echo("JIG_BODY", [body_cx, body_cy, body_x, body_y, body_height]);
echo("JIG_HOLE", [hole_d, stop_h, lay_cx, lay_cy, pocket_hx, pocket_hy, standoff]);
echo("JIG_TABS", [for (side = tab_sides()) tab_rect(side)]);
