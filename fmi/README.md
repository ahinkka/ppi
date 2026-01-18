# FMI product download and distribution generation

There's two downloaders:
- _downloader_ which uses FMI's WFS to fetch products. Doesn't work as of 2026-01.
- _s3\_downloader_ which uses FMI's AWS S3 bucket for fetching products.

Both of these download TIFFs and creates accompanying metadata .json-files.

The second one is `dist_builder` which builds a data distribution ready to be
deployed alongside the web UI - it takes the metadata files and TIFFs and
creates JSON files containing both the metadata and the data.
