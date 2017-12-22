/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
#include <chrono>
#include <cstdlib>
#include <iostream>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/predicate.hpp>

#include <gdal/cpl_conv.h>
#include <gdal/gdal_priv.h>

#include <jsoncpp/json/reader.h>
#include <jsoncpp/json/writer.h>


using namespace std;
using namespace boost::algorithm;


void gdalErrorHandler(CPLErr eErrClass, int err_no, const char *msg) {
    cerr << msg << endl;
    throw new runtime_error(msg);
}


chrono::milliseconds now_ms() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch());
}


std::string dump_metadata(GDALDataset* raster, Json::Value& additional_metadata) {
    auto json = Json::Value(Json::objectValue);

    auto members = additional_metadata.getMemberNames();
    for (auto const& member: members) {
        json[member] = additional_metadata[member];
    }

    json["width"] = raster->GetRasterXSize();
    json["height"] = raster->GetRasterYSize();
    json["projectionRef"] = raster->GetProjectionRef();

    double transform[6];
    raster->GetGeoTransform(transform);
    auto transform_json = Json::Value(Json::arrayValue);
    transform_json[0] = transform[0];
    transform_json[1] = transform[1];
    transform_json[2] = transform[2];
    transform_json[3] = transform[3];
    transform_json[4] = transform[4];
    transform_json[5] = transform[5];
    json["affineTransform"] = transform_json;

    Json::FastWriter writer;
    std::string output = writer.write(json);
    trim_right(output);
    cerr << "# Metadata: " << output << endl;
    return output;
}


std::string dump_data(GDALDataset* raster) {
    auto started_ms = now_ms();
    auto width = raster->GetRasterXSize();
    auto height = raster->GetRasterYSize();
    auto band_count = raster->GetRasterCount();

    if (band_count != 1) {
        throw new runtime_error("More or less than one raster band");
    }

    auto size = width * height;
    uint8_t data_values[size];
    auto band = raster->GetRasterBand(1);
    auto data_type = band->GetRasterDataType();
    if (data_type != GDALDataType::GDT_Byte) {
        throw new runtime_error(string("Can only handle Byte data; got ") + GDALGetDataTypeName(data_type));
    }

    for (int x = 0; x < width; x++) {
        for (int y = 0; y < height; y++) {
            auto index = x * width + y;
            if (index % (size / 10) == 0) {
                cerr << "# Reading data: " << ((float)index / (float)size) * 100.0 << "%" << endl;
            }

            char buf[1];
            band->RasterIO(GF_Read, x, y, 1, 1, &buf, 1, 1, GDALDataType::GDT_Byte, 0, 0);
            uint8_t data_value = static_cast<uint8_t>(buf[0]);
            data_values[index] = data_value;
        }
    }
    auto read_ms = now_ms();
    cerr << "# Reading data took " << (read_ms - started_ms).count() << " ms" << endl;

    auto result = std::string();
    // result.reserve(width * height * 3);
    // cerr << "# Reserved std::string with size of " << result.capacity() << endl;

    result += "[";
    for (int x = 0; x < width; x++) {
        result += "[";

        for (int y = 0; y < height; y++) {
            auto index = x * width + y;
            if (index % (size / 10) == 0) {
                cerr << "# Building data JSON: " << ((float)index / (float)size) * 100.0 << "%" << endl;
            }
            result += to_string(data_values[index]);
            if (y < height - 1) {
                result += ",";
            }
        }

        result += "]";
        if (x < width - 1) {
            result += ",\n";
        }
    }
    result += "]";

    // cerr << "# Resulting std::string size was " << result.size() << endl;
    auto json_built_ms = now_ms();
    cerr << "# Data JSON building took " << (json_built_ms - read_ms).count() << " ms" << endl;

    return result;
}


int main(int argc, char* argv[]) {
    if (argc < 2 || argc > 3) {
        cerr << "Need one input file as a positional argument." << endl;
        return EXIT_FAILURE;
    }

    GDALAllRegister();
    CPLSetErrorHandler(gdalErrorHandler);

    Json::Reader reader;
    Json::Value additional_metadata;
    bool success = reader.parse(cin, additional_metadata, false);
    if (!success) {
        cerr << "Error parsing additional metadata from stdin:" << endl << endl;
        cerr << reader.getFormattedErrorMessages() << endl;
        return EXIT_FAILURE;
    }

    cerr << "# Read a JSON object with "
         << additional_metadata.getMemberNames().size()
         << " metadata keys from stdin." << endl;

    try {
        auto started_ms = now_ms();
        auto path = std::string(argv[1]);
        GDALDataset* ds;

        cerr << "# Reading in " << path << endl;
        if (boost::ends_with(path, ".gz")) {
            cerr << "# Reading in (compressed) " << path << endl;
            ds = (GDALDataset*) GDALOpen((string("/vsigzip/") + path).c_str(), GA_ReadOnly);
        } else {
            cerr << "# Reading in " << path << endl;
            ds = (GDALDataset*) GDALOpen(path.c_str(), GA_ReadOnly);
        }

        cout << "{\"metadata\":" << dump_metadata(ds, additional_metadata) << ",\n";

        auto data_json = dump_data(ds);
        auto raster_dumped_ms = now_ms();
        cerr << "# Writing data..." << endl;
        cout << "\"data\": " << data_json << "}";

        cerr << "# Done in " << (now_ms() - started_ms).count() << " ms." << endl;
    } catch (const runtime_error& ex) {
        cerr << ex.what() << endl;
        return EXIT_FAILURE;
    } catch (const runtime_error* ex) {
        cerr << ex->what() << endl;
        return EXIT_FAILURE;
    }


    return EXIT_SUCCESS;
}
