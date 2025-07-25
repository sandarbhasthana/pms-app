# Rates Page Implementation Plan

## Current Status Analysis

### ✅ What's Already Built
- **Professional UI Layout**: Clean rates matrix interface
- **Date Navigation**: 7-day view with date picker controls
- **Room Type Display**: Shows room types with room counts
- **Rate Plan Selection**: Base Rate vs Promo Rate dropdown
- **Bulk Operations**: Long-term interval button for mass updates
- **Export Features**: CSV/Excel export options
- **Settings Menu**: Block dates, reset defaults functionality

### ❌ What's Missing
- **No API Integration**: All data is placeholder ($0.00)
- **No Database Queries**: Not connected to RoomPricing model
- **No Real-time Updates**: Static table without live data
- **No Availability Management**: Missing inventory controls
- **No Advanced Pricing**: No seasonal/dynamic pricing features

## Implementation Phases

### Phase 1: API Foundation (Week 1-2)

#### 1.1 Create Rates API Routes
```typescript
// src/app/api/rates/route.ts
export async function GET(req: NextRequest) {
  // Fetch room pricing data for date range
  // Include room types, base prices, availability
}

export async function POST(req: NextRequest) {
  // Bulk update rates for multiple rooms/dates
}

// src/app/api/rates/[roomTypeId]/route.ts
export async function PATCH(req: NextRequest) {
  // Update specific room type pricing
}
```

#### 1.2 Extend Database Schema
```prisma
model RoomPricing {
  // ... existing fields
  weekdayPrice    Float?
  weekendPrice    Float?
  seasonalRates   SeasonalRate[]
  availability    Int?           // Available rooms
  minLOS          Int?           // Minimum length of stay
  maxLOS          Int?           // Maximum length of stay
  closedToArrival Boolean @default(false)
  closedToDeparture Boolean @default(false)
}

model SeasonalRate {
  id          String   @id @default(cuid())
  pricingId   String
  startDate   DateTime
  endDate     DateTime
  multiplier  Float    // 1.2 for 20% increase
  pricing     RoomPricing @relation(fields: [pricingId], references: [id])
}

model DailyRate {
  id          String   @id @default(cuid())
  roomTypeId  String
  date        DateTime
  basePrice   Float
  availability Int
  minLOS      Int?
  maxLOS      Int?
  restrictions Json?    // Flexible restrictions
  
  @@unique([roomTypeId, date])
}
```

### Phase 2: Data Integration (Week 2-3)

#### 2.1 Connect UI to Real Data
```typescript
// Update rates page to fetch real data
const [ratesData, setRatesData] = useState<RateMatrix[]>([]);

useEffect(() => {
  fetchRatesData(startDate, ratePlan).then(setRatesData);
}, [startDate, ratePlan]);

// Replace placeholder $0.00 with dynamic pricing
{dates.map((date) => (
  <td key={date.toISOString()} className="p-3 text-center">
    <RateCellEditor
      roomTypeId={roomType.id}
      date={date}
      currentPrice={getRateForDate(roomType.id, date)}
      onPriceChange={handlePriceChange}
    />
  </td>
))}
```

#### 2.2 Add Inline Editing
```typescript
interface RateCellEditorProps {
  roomTypeId: string;
  date: Date;
  currentPrice: number;
  availability?: number;
  onPriceChange: (price: number) => void;
}

const RateCellEditor = ({ roomTypeId, date, currentPrice, onPriceChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState(currentPrice);
  
  const handleSave = async () => {
    await updateRoomRate(roomTypeId, date, price);
    onPriceChange(price);
    setIsEditing(false);
  };
  
  return isEditing ? (
    <input
      type="number"
      value={price}
      onChange={(e) => setPrice(Number(e.target.value))}
      onBlur={handleSave}
      onKeyPress={(e) => e.key === 'Enter' && handleSave()}
      className="w-full text-center border rounded px-1"
      autoFocus
    />
  ) : (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
    >
      ${price.toFixed(2)}
    </div>
  );
};
```

### Phase 3: Advanced Features (Week 3-4)

#### 3.1 Bulk Rate Updates
```typescript
// Implement Long-term Interval functionality
const BulkRateUpdateModal = () => {
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>();
  const [priceAction, setPriceAction] = useState<'set' | 'increase' | 'decrease'>('set');
  const [value, setValue] = useState<number>(0);
  
  const handleBulkUpdate = async () => {
    await bulkUpdateRates({
      roomTypeIds: selectedRoomTypes,
      startDate: dateRange.start,
      endDate: dateRange.end,
      action: priceAction,
      value: value
    });
  };
};
```

#### 3.2 Availability Management
```typescript
// Add availability controls to each cell
const AvailabilityControls = ({ roomTypeId, date, currentAvailability }) => {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="text-sm font-medium">${price}</div>
      <div className="text-xs text-gray-500">
        {currentAvailability} available
      </div>
      <div className="flex space-x-1">
        <button
          onClick={() => updateAvailability(roomTypeId, date, currentAvailability - 1)}
          className="w-4 h-4 bg-red-500 text-white text-xs rounded"
        >
          -
        </button>
        <button
          onClick={() => updateAvailability(roomTypeId, date, currentAvailability + 1)}
          className="w-4 h-4 bg-green-500 text-white text-xs rounded"
        >
          +
        </button>
      </div>
    </div>
  );
};
```

### Phase 4: Seasonal & Dynamic Pricing (Week 4-5)

#### 4.1 Seasonal Rate Management
```typescript
const SeasonalRatesManager = () => {
  const [seasons, setSeasons] = useState<SeasonalRate[]>([]);
  
  return (
    <div className="space-y-4">
      <h3>Seasonal Rates</h3>
      {seasons.map(season => (
        <div key={season.id} className="border p-4 rounded">
          <div className="grid grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Season name"
              value={season.name}
            />
            <input
              type="date"
              value={format(season.startDate, 'yyyy-MM-dd')}
            />
            <input
              type="date"
              value={format(season.endDate, 'yyyy-MM-dd')}
            />
            <input
              type="number"
              placeholder="Price multiplier"
              value={season.multiplier}
              step="0.1"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 4.2 Dynamic Pricing Engine
```typescript
const calculateDynamicPrice = (
  basePrice: number,
  date: Date,
  occupancyRate: number,
  seasonalMultiplier: number,
  demandFactor: number
): number => {
  let price = basePrice;
  
  // Apply seasonal adjustment
  price *= seasonalMultiplier;
  
  // Apply occupancy-based pricing
  if (occupancyRate > 0.8) price *= 1.2;
  else if (occupancyRate < 0.3) price *= 0.9;
  
  // Apply demand factor
  price *= demandFactor;
  
  // Weekend premium
  if (isWeekend(date)) price *= 1.15;
  
  return Math.round(price * 100) / 100;
};
```

### Phase 5: Restrictions & Rules (Week 5-6)

#### 5.1 Length of Stay Controls
```typescript
const LOSControls = ({ roomTypeId, date }) => {
  const [minLOS, setMinLOS] = useState(1);
  const [maxLOS, setMaxLOS] = useState(30);
  
  return (
    <div className="flex space-x-2 text-xs">
      <div>
        <label>Min LOS:</label>
        <input
          type="number"
          value={minLOS}
          onChange={(e) => setMinLOS(Number(e.target.value))}
          className="w-12 border rounded px-1"
          min="1"
        />
      </div>
      <div>
        <label>Max LOS:</label>
        <input
          type="number"
          value={maxLOS}
          onChange={(e) => setMaxLOS(Number(e.target.value))}
          className="w-12 border rounded px-1"
          min="1"
        />
      </div>
    </div>
  );
};
```

#### 5.2 Arrival/Departure Restrictions
```typescript
const RestrictionControls = ({ roomTypeId, date }) => {
  const [closedToArrival, setClosedToArrival] = useState(false);
  const [closedToDeparture, setClosedToDeparture] = useState(false);
  
  return (
    <div className="flex space-x-2 text-xs">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={closedToArrival}
          onChange={(e) => setClosedToArrival(e.target.checked)}
          className="mr-1"
        />
        CTA
      </label>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={closedToDeparture}
          onChange={(e) => setClosedToDeparture(e.target.checked)}
          className="mr-1"
        />
        CTD
      </label>
    </div>
  );
};
```

## Success Metrics

### Technical Metrics
- ✅ **API Response Time**: < 200ms for rate queries
- ✅ **Real-time Updates**: Instant UI updates after rate changes
- ✅ **Bulk Operations**: Handle 100+ room-date combinations
- ✅ **Data Accuracy**: 100% sync between UI and database

### Business Metrics
- ✅ **Revenue Optimization**: Dynamic pricing increases ADR by 15%
- ✅ **Operational Efficiency**: 50% reduction in manual rate updates
- ✅ **User Adoption**: 90% of property managers use bulk features
- ✅ **Error Reduction**: 95% fewer pricing mistakes

## Integration Points

### Calendar Integration
- Sync rates with booking calendar
- Show pricing on availability grid
- Update rates from calendar interface

### Channel Management
- Push rate updates to OTA channels
- Sync availability across platforms
- Handle rate parity requirements

### Reporting Integration
- Rate change audit logs
- Revenue impact analysis
- Pricing performance metrics

This implementation plan transforms your current placeholder rates page into a fully functional, professional-grade pricing management system that aligns with industry standards and your PMS requirements.
