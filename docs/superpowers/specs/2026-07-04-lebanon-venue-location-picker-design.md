# Lebanon Venue Location Picker Design

## Goal

Replace free-form venue city entry in create-venue and venue-manager onboarding flows with a Lebanon-only hierarchical picker sourced from the supplied GeoNames catalogue.

## Mapping

Use the supplied rows exactly as `location | district/city | governorate | latitude | longitude | aliases`. The UI flow is:

1. Governorate
2. City / district, using the file's second column without remapping
3. Location, using the file's first column

The stored backend `city` field remains a plain locality name for compatibility with current APIs. Selecting a location also fills latitude and longitude from the catalogue.

## User Experience

The shared `VenueLocationFields` component becomes the single location picker used by:

- `src/app/dashboard/venues/new/page.tsx`
- `src/app/dashboard/onboarding/venue-manager/page.tsx`
- `src/app/dashboard/users/create/venue-manager/page.tsx`

Each level is searchable. City / district is disabled until a governorate is selected; location is disabled until both previous levels are selected. Existing saved city values seed the picker by matching location name or alias when possible.

## Data

Create a client-importable Lebanon location catalogue under `src/lib`. The catalogue keeps governorate, city/district, location name, aliases, and coordinates. Helper functions expose unique governorates, city/district options by governorate, location options by governorate and city/district, and lookup by name or alias.

## Validation

Existing form validation continues to require `city.trim()`. No API payload shape changes are required.

## Verification

Run a data sanity script, TypeScript/lint checks, and a production build if available. The data sanity script verifies core governorates, known mappings, alias search, and coordinate fill candidates.
