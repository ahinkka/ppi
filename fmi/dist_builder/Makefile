CPLUS_INCLUDE_PATH :=
LIBRARY_PATH :=
BOOST_LIB := boost_iostreams

# You might need the following on Mac (if using MacPorts):
# CPLUS_INCLUDE_PATH := /opt/local/include
# LIBRARY_PATH := /opt/local/lib
# BOOST_LIB := boost_iostreams-mt
# End of MacPorts additions


CPPFLAGS := -I $(CPLUS_INCLUDE_PATH) -L $(LIBRARY_PATH) -std=c++11 -Wall -ljsoncpp -lgdal -l$(BOOST_LIB)

raster_to_json: raster_to_json.cpp
	$(CXX) $(CPPFLAGS) $(CFLAGS) -o $@ $^

.PHONY: clean
clean:
	rm raster_to_json
