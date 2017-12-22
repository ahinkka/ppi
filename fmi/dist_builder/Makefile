CPPFLAGS := -std=c++11 -Wall -ljsoncpp -lgdal -lboost_iostreams

raster_to_json: raster_to_json.cpp
	$(CXX) $(CPPFLAGS) $(CFLAGS) -o $@ $^

.PHONY: clean
clean:
	rm raster_to_json
