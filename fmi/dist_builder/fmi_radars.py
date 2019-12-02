# -*- mode=python; encoding:utf-8 -*-
"""
FMI's radars, from http://ilmatieteenlaitos.fi/suomen-tutkaverkko
"""
import unicodedata


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


_radar_list = [
    {
        "name": u"Ikaalinen",
        "lat": 61.7673, "lon": 23.0764, "altitude": 153
    },
    {
        "name": u"Anjalankoski",
        "lat": 60.9039, "lon": 27.1081, "altitude": 139
    },
    {
        "name": u"Kuopio",
        "lat": 62.8626, "lon": 27.3815, "altitude": 268
    },
    {
        "name": u"Korpo",
        "lat": 60.1285, "lon": 21.6434, "altitude": 61
    },
    {
        "name": u"Luosto",
        "lat": 67.1391, "lon": 26.8969, "altitude": 533
    },
    {
        "name": u"Utajärvi",
        "lat": 64.7749, "lon": 26.3189, "altitude": 118
    },
    {
        "name": u"Vantaa",
        "lat": 60.2706, "lon": 24.8690, "altitude": 82
    },
    {
        "name": u"Vimpeli",
        "lat": 63.1048, "lon": 23.8209, "altitude": 200
    },
    {
        "name": u"Kesälahti",
        "lat": 61.9070, "lon": 29.7977, "altitude": 174
    },
    {
        "name": u"Petäjävesi",
        "lat": 62.3045, "lon": 25.4401, "altitude": 271
    },
    {
        "name": "Nurmes",
        "lat": "63.8378", "lon": 29.4489, "altitude": 323
    }
]


radars = {}
for radar in _radar_list:
    id = strip_accents(radar["name"]).lower()
    radar[id] = id
    radars[id] = radar
