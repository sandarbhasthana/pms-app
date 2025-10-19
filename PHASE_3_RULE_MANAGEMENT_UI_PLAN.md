# Phase 3: Rule Management UI - Implementation Plan

## 🎯 **Objectives**

Build a comprehensive UI for managing business rules with:
- Rule list with filters and sorting
- Rule editor (create/edit/delete)
- Pre-defined rule templates
- Real-time validation and preview
- AI-friendly configuration

---

## 📋 **Components to Build**

### **1. Rule List Component** (`RuleListComponent.tsx`)
**Purpose:** Display all rules with management options

**Features:**
- ✅ Table view with columns: Name, Type, Status, Priority, Actions
- ✅ Filter by: Status (Active/Inactive), Type (Weekend/Occupancy/Seasonal)
- ✅ Sort by: Name, Priority, Created Date
- ✅ Search by rule name
- ✅ Bulk actions: Enable/Disable, Delete
- ✅ Quick edit button
- ✅ Delete with confirmation

**Data Structure:**
```typescript
interface RuleListItem {
  id: string;
  name: string;
  description?: string;
  type: 'WEEKEND' | 'OCCUPANCY' | 'SEASONAL';
  isActive: boolean;
  priority: number;
  createdAt: Date;
  appliedCount?: number;
}
```

---

### **2. Rule Editor Component** (`RuleEditorSheet.tsx`)
**Purpose:** Create/edit rules with visual builder

**Features:**
- ✅ Tabbed interface: Details, Conditions, Actions, Preview
- ✅ Rule name and description
- ✅ Rule type selector
- ✅ Priority slider (1-100)
- ✅ Active/Inactive toggle
- ✅ Condition builder (visual)
- ✅ Action builder (visual)
- ✅ Real-time preview
- ✅ Save/Cancel buttons

**Tabs:**
1. **Details Tab**
   - Name, Description
   - Type selector
   - Priority slider
   - Active toggle

2. **Conditions Tab**
   - Add/Remove conditions
   - Condition type selector
   - Operator selector
   - Value input
   - AND/OR logic

3. **Actions Tab**
   - Add/Remove actions
   - Action type selector
   - Value input
   - Metadata (optional)

4. **Preview Tab**
   - Rule summary
   - Condition logic
   - Action effects
   - Example scenarios

---

### **3. Rule Templates Component** (`RuleTemplatesModal.tsx`)
**Purpose:** Pre-defined templates for quick setup

**Templates:**
1. **Weekend Pricing**
   - +25% on weekends with >80% occupancy
   - Conditions: Day of week = Weekend, Occupancy > 80%
   - Action: Multiply price by 1.25

2. **Occupancy-Based Surge**
   - +40% when occupancy >90%
   - Conditions: Occupancy > 90%
   - Action: Multiply price by 1.40

3. **Seasonal Pricing**
   - -15% during low season
   - Conditions: Date range (summer months)
   - Action: Multiply price by 0.85

4. **Early Bird Discount**
   - -10% for bookings >30 days in advance
   - Conditions: Advance booking > 30 days
   - Action: Multiply price by 0.90

5. **Last Minute Deal**
   - -15% for bookings <3 days
   - Conditions: Advance booking < 3 days, Occupancy < 60%
   - Action: Multiply price by 0.85

6. **Extended Stay Discount**
   - -20% for stays >7 nights
   - Conditions: Length of stay > 7
   - Action: Multiply price by 0.80

---

### **4. Rule Management Page** (`/settings/business-rules/manage/page.tsx`)
**Purpose:** Main page integrating all components

**Layout:**
```
┌─────────────────────────────────────┐
│ Business Rules Management           │
│ [Create Rule] [Import] [Export]     │
├─────────────────────────────────────┤
│ Filters: [Status] [Type] [Search]   │
├─────────────────────────────────────┤
│ Rule List Table                     │
│ ┌─────────────────────────────────┐ │
│ │ Name | Type | Status | Priority │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔌 **API Endpoints Needed**

### **GET /api/business-rules**
- List all rules for property
- Query params: status, type, search, sort, page

### **POST /api/business-rules**
- Create new rule
- Body: BusinessRuleDefinition

### **PATCH /api/business-rules/[id]**
- Update rule
- Body: Partial BusinessRuleDefinition

### **DELETE /api/business-rules/[id]**
- Delete rule

### **POST /api/business-rules/[id]/toggle**
- Toggle rule active/inactive

### **POST /api/business-rules/bulk**
- Bulk operations (enable/disable/delete)

---

## 🎨 **UI/UX Considerations**

- ✅ Consistent with existing design system
- ✅ Dark mode support
- ✅ Responsive design (mobile-friendly)
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Loading states
- ✅ Error handling with toast notifications
- ✅ Confirmation dialogs for destructive actions
- ✅ Real-time validation feedback

---

## 📊 **Implementation Order**

1. **Step 1:** Create Rule List Component
2. **Step 2:** Create Rule Editor Component
3. **Step 3:** Create Rule Templates Component
4. **Step 4:** Create Rule Management Page
5. **Step 5:** Build API endpoints
6. **Step 6:** Integration testing

---

## 🚀 **Success Criteria**

- ✅ All components render without errors
- ✅ CRUD operations work correctly
- ✅ Filters and sorting work
- ✅ Templates can be applied
- ✅ Real-time preview works
- ✅ Mobile responsive
- ✅ Dark mode support
- ✅ Accessibility compliant
- ✅ Performance optimized

---

**Ready to start Step 1: Rule List Component** 🚀

