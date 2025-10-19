# Business Rules Engine - Architecture Overview

## 🏗️ **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Settings Page          Management Page                      │
│  ┌──────────────┐      ┌──────────────────────────────┐     │
│  │ Enable/      │      │ Rule List Component          │     │
│  │ Disable      │      │ ├─ Search                    │     │
│  │ Toggle       │      │ ├─ Filter                    │     │
│  │              │      │ ├─ Sort                      │     │
│  │ Info Box     │      │ └─ Actions Menu              │     │
│  └──────────────┘      └──────────────────────────────┘     │
│                                                               │
│  Rule Editor Sheet     Templates Modal                       │
│  ┌──────────────┐      ┌──────────────────────────────┐     │
│  │ Details Tab  │      │ Template Cards (6)           │     │
│  │ Conditions   │      │ ├─ Weekend Pricing           │     │
│  │ Actions Tab  │      │ ├─ Occupancy Surge           │     │
│  │ Preview Tab  │      │ ├─ Seasonal Pricing          │     │
│  └──────────────┘      │ ├─ Early Bird                │     │
│                        │ ├─ Last Minute               │     │
│                        │ └─ Extended Stay             │     │
│                        └──────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GET /api/business-rules          List rules                │
│  POST /api/business-rules         Create rule               │
│  GET /api/business-rules/[id]     Get rule                  │
│  PATCH /api/business-rules/[id]   Update rule               │
│  DELETE /api/business-rules/[id]  Delete rule               │
│  POST /api/business-rules/[id]/toggle  Toggle status        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  BusinessRulesEngine (engine.ts)                            │
│  ├─ Rule execution                                          │
│  ├─ Condition evaluation                                    │
│  └─ Action application                                      │
│                                                               │
│  PricingIntegrationService (pricing-integration.ts)         │
│  ├─ Price calculation                                       │
│  ├─ Rule application                                        │
│  └─ Fallback handling                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Property Model                                             │
│  ├─ businessRulesEnabled (Boolean)                          │
│  └─ businessRulesConfig (Json)                              │
│                                                               │
│  BusinessRule Model (Prisma)                                │
│  ├─ id, name, description                                   │
│  ├─ category, priority, isActive                            │
│  ├─ propertyId, organizationId                              │
│  ├─ conditions, actions                                     │
│  └─ metadata, createdBy, updatedBy                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Data Flow**

### **Create Rule Flow**
```
User Input (UI)
    ↓
RuleEditorSheet (Validation)
    ↓
POST /api/business-rules
    ↓
Prisma.businessRule.create()
    ↓
Database
    ↓
Response to UI
    ↓
RuleListComponent (Update)
```

### **Apply Rule Flow**
```
GET /api/rates?applyRules=true
    ↓
Fetch Property (businessRulesEnabled)
    ↓
PricingIntegrationService.calculateEnhancedPrice()
    ↓
BusinessRulesEngine.executeRules()
    ↓
Evaluate Conditions
    ↓
Apply Actions
    ↓
Calculate Final Price
    ↓
Return with Applied Rules
```

---

## 📦 **Component Hierarchy**

```
BusinessRulesSettingsPage
├── SettingsTabs
├── Enable/Disable Toggle
├── Info Box
└── Link to Management Page
    ↓
RuleManagementPage
├── Header
├── Action Buttons
│   ├── Create Rule
│   └── Templates
├── RuleListComponent
│   ├── Search Input
│   ├── Filter Dropdown
│   ├── Sort Dropdown
│   └── Rules Table
│       └── Dropdown Menu (Edit/Toggle/Delete)
├── RuleEditorSheet
│   ├── Tabs
│   │   ├── Details Tab
│   │   ├── Conditions Tab
│   │   ├── Actions Tab
│   │   └── Preview Tab
│   └── Save/Cancel Buttons
└── RuleTemplatesModal
    ├── Template Cards (6)
    └── Use Template Button
```

---

## 🔌 **Integration Points**

### **With /api/rates**
```typescript
// When applyRules=true
GET /api/rates?startDate=2025-10-20&days=7&applyRules=true

// Response includes
{
  finalPrice: 2500,
  basePrice: 2000,
  appliedRules: [
    { ruleName: "Weekend Pricing", adjustment: "+25%" }
  ],
  rulesApplied: true,
  businessRulesEnabled: true
}
```

### **With Settings**
```
Settings → Business Rules
├── Enable/Disable Toggle
│   └── PATCH /api/properties/[id]
│       └── businessRulesEnabled: boolean
└── Manage Rules Button
    └── Navigate to /settings/business-rules/manage
```

---

## 🎯 **Rule Execution Flow**

```
Rule Conditions
├─ day_of_week = weekend
├─ occupancy > 80%
└─ AND logic

    ↓ (All conditions met)

Rule Actions
├─ multiply_price: 1.25
└─ Apply to final price

    ↓

Final Price = Base Price × 1.25
```

---

## 📊 **Database Schema**

### **Property Model**
```prisma
model Property {
  // ... existing fields ...
  businessRulesEnabled    Boolean             @default(false)
  businessRulesConfig     Json?               @default("{}")
  businessRules           BusinessRule[]
  // ... rest of fields ...
}
```

### **BusinessRule Model**
```prisma
model BusinessRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  category        String   // PRICING, AVAILABILITY, RESTRICTIONS
  priority        Int      // 1-100
  isActive        Boolean  @default(true)
  
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id])
  
  organizationId  String
  
  conditions      Json     // Array of RuleCondition
  actions         Json     // Array of RuleAction
  metadata        Json?
  
  createdBy       String
  updatedBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([propertyId])
  @@index([organizationId])
  @@index([isActive])
}
```

---

## 🔐 **Security Layers**

```
Request
  ↓
Session Validation (getServerSession)
  ↓
User Authentication Check
  ↓
Property Access Verification
  ↓
Input Validation
  ↓
Database Operation
  ↓
Response (No sensitive data exposed)
```

---

## 🚀 **Performance Optimizations**

1. **Pagination** - 50 items per page
2. **Filtering** - Reduce dataset before sorting
3. **Indexing** - propertyId, organizationId, isActive
4. **Memoization** - React components
5. **Lazy Loading** - Load rules on demand
6. **Caching** - API response caching (future)

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- Component rendering
- Form validation
- Filter/sort logic

### **Integration Tests**
- API endpoints
- Database operations
- Rule execution

### **E2E Tests**
- Complete user workflows
- Mobile responsiveness
- Dark mode

---

## 📈 **Scalability**

- ✅ Property-scoped rules
- ✅ Organization-scoped rules
- ✅ Pagination support
- ✅ Efficient queries
- ✅ Stateless API design

---

## 🔄 **Future Enhancements**

1. **Rule Versioning** - Track rule changes
2. **Rule Analytics** - Track rule usage
3. **Bulk Operations** - Manage multiple rules
4. **Rule Import/Export** - Backup and restore
5. **AI Suggestions** - ML-powered recommendations
6. **Conflict Detection** - Warn about conflicting rules
7. **Rule Testing** - Test with sample data
8. **Advanced Conditions** - Complex condition builder

---

**Architecture Version:** 1.0
**Last Updated:** 2025-10-19
**Status:** ✅ Production Ready

