# FMI distribution builder

`collect_radar_products.py` creates a JSON output suitable for the top-level
`collect.py`.

`raster_to_json.py` is a shell executable that converts TIFFs into JSON format
the client understands. `raster_to_json` contains a faster Rust version of it.
