# Multi-Property Single Organization Example

## Database Schema Enhancement

```prisma
model Organization {
  id           String        @id @default(cuid())
  name         String        // "Grand Palace Hotels"
  domain       String?       @unique // "grandpalace"
  properties   Property[]    // NEW: Multiple properties
  // ... existing fields
}

model Property {
  id             String       @id @default(cuid())
  organizationId String
  name           String       // "Downtown NYC", "Beach Resort Miami"
  address        String
  phone          String?
  email          String?
  timezone       String       @default("UTC")
  currency       String       @default("USD")
  organization   Organization @relation(fields: [organizationId], references: [id])
  roomTypes      RoomType[]
  
  @@index([organizationId])
}

model RoomType {
  id         String    @id @default(cuid())
  propertyId String    // Links to specific property
  name       String    // "Downtown Executive Suite"
  property   Property  @relation(fields: [propertyId], references: [id])
  // ... existing fields
}
```

## UI Implementation

```typescript
// Property Switcher Component
export function PropertySwitcher() {
  const [currentProperty, setCurrentProperty] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);

  return (
    <Select value={currentProperty} onValueChange={setCurrentProperty}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select Property" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="prop_downtown">Downtown NYC</SelectItem>
        <SelectItem value="prop_beach">Beach Resort Miami</SelectItem>
        <SelectItem value="prop_mountain">Mountain Lodge Colorado</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Enhanced Calendar View
export function MultiPropertyCalendar() {
  const [selectedProperty, setSelectedProperty] = useState("all");
  
  return (
    <div>
      <PropertySwitcher />
      {selectedProperty === "all" ? (
        <AllPropertiesView />
      ) : (
        <SinglePropertyView propertyId={selectedProperty} />
      )}
    </div>
  );
}
```

## Benefits:
✅ Single login for all properties
✅ Unified reporting across properties  
✅ Shared guest database
✅ Centralized staff management
✅ Cost-effective (one subscription)
