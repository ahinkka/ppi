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
        "name": "Anjalankoski",
        "id": "fianj",
        "lat": 60.9039, "lon": 27.1081, "altitude": 139
    },
    {
        "name": "Inari",
        "id": "fikau",
        "lat": 68.4343, "lon": 27.4428, "altitude": 437
    },
    {
        "name": "Kankaanpää",
        "id": "fikan",
        "lat": 61.8108, "lon": 23.4997, "altitude": 174
    },
    {
        "name": "Kesälahti",
        "id": "fikes",
        "lat": 61.9070, "lon": 29.7977, "altitude": 174
    },
    {
        "name": "Korpo",
        "id": "fikor",
        "lat": 60.1285, "lon": 21.6434, "altitude": 61
    },
    {
        "name": "Kuopio",
        "id": "fikuo",
        "lat": 62.8626, "lon": 27.3815, "altitude": 268
    },
    {
        "name": "Luosto",
        "id": "filuo",
        "lat": 67.1391, "lon": 26.8969, "altitude": 533
    },
    {
        "name": "Nurmes",
        "id": "finur",
        "lat": "63.8378", "lon": 29.4489, "altitude": 323
    },
    {
        "name": "Petäjävesi",
        "id": "fipet",
        "lat": 62.3045, "lon": 25.4401, "altitude": 271
    },
    {
        "name": "Utajärvi",
        "id": "fiuta",
        "lat": 64.7749, "lon": 26.3189, "altitude": 118
    },
    {
        "name": "Vantaa",
        "id": "fivan",
        "lat": 60.2706, "lon": 24.8690, "altitude": 82
    },
    {
        "name": "Vihti",
        "id": "fivih",
        "lat": 60.56, "lon": 24.5, "altitude": 148
    },
    {
        "name": "Vimpeli",
        "id": "fivim",
        "lat": 63.1048, "lon": 23.8209, "altitude": 200
    },
    {
        "name": "Finland composite",
        "id": "finrad",
        "lat": 64.180708, "lon": 25.803222, "altitude": 0, "composite": True
    },
]

radars = {radar["id"]: radar for radar in _radar_list}
