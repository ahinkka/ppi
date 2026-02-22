use std::convert::TryInto;
use std::env;
use std::io::{self, Read};
use std::process;
use std::time::Instant;

use std::collections::HashMap;
use std::path::Path;

use gdal::raster::GdalDataType;
use gdal::raster::RasterBand;
use gdal::raster::ResampleAlg;
use gdal::Dataset;

use serde_json::{json, Value};

use indicatif::{ProgressBar, ProgressStyle};

fn populate_metadata(ds: &Dataset, metadata: &mut Value) {
    let (width, height) = ds.raster_size();
    let projection = ds.projection();

    metadata["width"] = json!(width);
    metadata["height"] = json!(height);
    metadata["projectionRef"] = json!(projection);

    let transform = ds.geo_transform().unwrap();
    metadata["affineTransform"] = json!(transform);
}

fn populate_data(ds: &Dataset) -> Vec<Vec<u8>> {
    let (width, height) = ds.raster_size();
    let band_count = ds.raster_count();

    if band_count != 1 {
        panic!("More or less than one raster band");
    }

    let band: RasterBand = ds.rasterband(1).unwrap();

    let band_type = band.band_type();
    if band_type != GdalDataType::UInt8 {
        panic!("Can only handle UInt8 (Byte) data; got {}", band_type);
    }

    let mut rows: Vec<Vec<u8>> = Vec::with_capacity(width);

    let pb = ProgressBar::new(width.try_into().unwrap());
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{wide_bar:.cyan/blue}] ({pos}/{len}, ETA {eta})")
            .expect("progress style")
    );

    for x in 0..width {
        pb.set_position(x.try_into().unwrap());
        let d: Vec<u8> = band
            .read_as::<u8>(
                (x as isize, 0),
                (1, height),
                (1, height),
                Some(ResampleAlg::Bilinear),
            )
            .unwrap()
            .data()
            .to_vec();
        rows.push(d);
    }

    return rows;
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 || args.len() > 3 {
        eprintln!("Need one input file as a positional argument.");
        process::exit(1);
    }

    let start = Instant::now();

    let mut stdin_metadata = String::new();
    eprintln!("Reading additional metadata...");
    io::stdin().read_to_string(&mut stdin_metadata).unwrap();
    let mut metadata: Value = serde_json::from_str(&stdin_metadata).unwrap();
    eprintln!(
        "Parsed {} keys from metadata.",
        metadata.as_object().unwrap().len()
    );

    let path = if args[1].ends_with(".gz") {
        format!("/vsigzip/{}", args[1])
    } else {
        args[1].clone()
    };
    let ds = Dataset::open(Path::new(&path)).unwrap();

    populate_metadata(&ds, &mut metadata);

    let data = populate_data(&ds);
    let mut _o: HashMap<String, Value> = HashMap::new();
    let mut output: Value = json!(_o);
    output["metadata"] = metadata;
    output["data"] = json!(data);
    eprintln!("Starting JSON deserialization...");
    println!("{}", output.to_string());
    eprintln!("Done in {} ms.", start.elapsed().as_millis());
}
