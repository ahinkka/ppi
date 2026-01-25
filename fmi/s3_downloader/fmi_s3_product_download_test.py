import unittest
from datetime import datetime as dt, timezone
from fmi_s3_product_download import Product, DataScale, _dbzh_datascale


class TestRadarPPI(unittest.TestCase):
    def test_ppi_elevation_0_3_dbzh(self):
        filename = "202601240000_fikau_ppi_0.3_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "PPI dbZh")
        self.assertEqual(result.product_subtype, "EL 0.3°")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertIsNone(result.height)
        self.assertEqual(result.elevation, 0.3)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertFalse(result.composite)

    def test_ppi_elevation_0_7_dbzh(self):
        filename = "202601240000_fikau_ppi_0.7_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "PPI dbZh")
        self.assertEqual(result.product_subtype, "EL 0.7°")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertIsNone(result.height)
        self.assertEqual(result.elevation, 0.7)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertFalse(result.composite)

    def test_ppi_elevation_0_3_hclass(self):
        filename = "202601240000_fikau_ppi_0.3_hclass_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "PPI hclass")
        self.assertEqual(result.product_subtype, "EL 0.3°")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "hclass")
        self.assertEqual(result.data_unit, "hclass")
        self.assertIsNone(result.height)
        self.assertEqual(result.elevation, 0.3)
        self.assertIsNone(result.data_scale)
        self.assertFalse(result.composite)

    def test_ppi_elevation_0_3_vrad(self):
        filename = "202601240000_fikau_ppi_0.3_vrad_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "PPI vrad")
        self.assertEqual(result.product_subtype, "EL 0.3°")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "V")
        self.assertEqual(result.data_unit, "m/s")
        self.assertIsNone(result.height)
        self.assertEqual(result.elevation, 0.3)
        self.assertIsNone(result.data_scale)
        self.assertFalse(result.composite)

    def test_ppi_different_site(self):
        filename = "202601240000_fivim_ppi_0.3_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fivim")
        self.assertEqual(result.product_type, "PPI dbZh")
        self.assertEqual(result.product_subtype, "EL 0.3°")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertIsNone(result.height)
        self.assertEqual(result.elevation, 0.3)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertFalse(result.composite)


class TestRadarCAPPI(unittest.TestCase):
    def test_cappi_height_600_dbzh(self):
        filename = "202601240000_fikau_cappi_600_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "CAPPI dbZh")
        self.assertEqual(result.product_subtype, "H 600 m")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertEqual(result.height, 600.0)
        self.assertIsNone(result.elevation)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertFalse(result.composite)

    def test_cappi_different_site(self):
        filename = "202601240000_fivan_cappi_600_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fivan")
        self.assertEqual(result.product_type, "CAPPI dbZh")
        self.assertEqual(result.product_subtype, "H 600 m")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertEqual(result.height, 600.0)
        self.assertIsNone(result.elevation)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertFalse(result.composite)


class TestRadarETOP(unittest.TestCase):
    def test_etop_negative_threshold(self):
        filename = "202601240000_fikau_etop_-10_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "ETOP")
        self.assertEqual(result.product_subtype, "THR -10")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "height")
        self.assertEqual(result.data_unit, "km")
        self.assertIsNone(result.height)
        self.assertIsNone(result.elevation)
        self.assertIsNone(result.data_scale)
        self.assertFalse(result.composite)

    def test_etop_positive_threshold_20(self):
        filename = "202601240000_fikau_etop_20_dbzh_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "fikau")
        self.assertEqual(result.product_type, "ETOP")
        self.assertEqual(result.product_subtype, "THR 20")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "height")
        self.assertEqual(result.data_unit, "km")
        self.assertIsNone(result.height)
        self.assertIsNone(result.elevation)
        self.assertIsNone(result.data_scale)
        self.assertFalse(result.composite)


class TestCompositeCAPPI(unittest.TestCase):
    def test_composite_cappi_height_600_dbzh_finrad(self):
        filename = "202601240000_composite_cappi_600_dbzh_finrad_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "finrad")
        self.assertEqual(result.product_type, "CAPPI dbZh")
        self.assertEqual(result.product_subtype, "H 600 m")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "Z")
        self.assertEqual(result.data_unit, "dbZ")
        self.assertEqual(result.height, 600.0)
        self.assertIsNone(result.elevation)
        self.assertEqual(result.data_scale, _dbzh_datascale)
        self.assertTrue(result.composite)


class TestCompositeACRR(unittest.TestCase):
    def test_composite_acrr_1h(self):
        filename = "202601240000_composite_cappi_600_acrr1h_finradfast_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "finradfast")
        self.assertEqual(result.product_type, "ACRR mm")
        self.assertEqual(result.product_subtype, "1h")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "rr")
        self.assertEqual(result.data_unit, "mm")
        self.assertEqual(result.height, 600.0)
        self.assertIsNone(result.elevation)
        self.assertIsNone(result.data_scale)
        self.assertTrue(result.composite)

    def test_composite_acrr_3h(self):
        filename = "202601240000_composite_cappi_600_acrr3h_finradfast_qc.tif"
        result = Product.from_filename(filename)

        self.assertEqual(result.timestamp, dt(2026, 1, 24, 0, 0, tzinfo=timezone.utc))
        self.assertEqual(result.site, "finradfast")
        self.assertEqual(result.product_type, "ACRR mm")
        self.assertEqual(result.product_subtype, "3h")
        self.assertEqual(result.filename, filename)
        self.assertEqual(result.data_type, "rr")
        self.assertEqual(result.data_unit, "mm")
        self.assertEqual(result.height, 600.0)
        self.assertIsNone(result.elevation)
        self.assertIsNone(result.data_scale)
        self.assertTrue(result.composite)


if __name__ == '__main__':
    unittest.main()
