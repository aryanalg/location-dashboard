# Location Normalization

## Strategy
Excel data may contain inconsistent location entries. The dashboard normalizes all variations to standard categories.

## Mapping Rules

| Standard Location | Variations (case-insensitive) |
|-------------------|-------------------------------|
| Wax | wax, waxing, wax dept |
| Casting | casting, cast, casted |
| Filing/Assembly | filing, assembly, file, filing/assembly, f/a |
| Polishing | polishing, polish, pol, buffing |
| Electro | electro, plating, electroplating, plate |
| Packing | packing, pack, packed, shipping |
| MKS Setting | mks, mks set, mks xset, mks setting, setting, stone setting, stone set |
| Outsource | outsource, outsourced, external, outside |
| QC | qc, quality, quality control, inspection |

## Matching Logic

1. Trim whitespace
2. Convert to lowercase
3. Check if input **contains** any variation keyword
4. If no match → categorize as "Other"

## Adding New Mappings

Edit `locationConfig` in app.js:
```javascript
const LOCATION_MAPPINGS = {
  'Wax': ['wax', 'waxing'],
  'MKS Setting': ['mks', 'setting', 'xset'],
  // add more...
};
```
