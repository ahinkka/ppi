# FMI S3 Downloader

## Running Tests

```bash
source env/bin/activate
python -m unittest fmi_s3_product_download_test.py -v
```

Run specific test class:
```bash
python -m unittest fmi_s3_product_download_test.TestRadarPPI -v
```

Run specific test:
```bash
python -m unittest fmi_s3_product_download_test.TestRadarPPI.test_ppi_elevation_0_3_dbzh -v
```
