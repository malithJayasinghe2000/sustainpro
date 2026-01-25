# 📊 Widget Library - User Guide

## What is the Widget Library?

The **Widget Library** is a powerful tool that allows Super Admins to create, customize, and manage the visual components (widgets) that appear on device dashboards. Think of it as a "template builder" for dashboard elements.

---

## 🎯 Key Concepts

### What is a Widget?

A **widget** is a visual component that displays information on a dashboard. Examples include:
- **Temperature Card** - Shows current temperature reading
- **Tank Level Gauge** - Visualizes water/fuel levels
- **Status Indicator** - Shows if a device is online/offline
- **Line Chart** - Displays historical data trends

### Why Create Custom Widgets?

Instead of manually creating the same type of display for every device, you can:
1. Create a widget template once
2. Reuse it across all dashboards
3. Update it in one place to affect all instances

---

## 🏗️ Creating a New Widget

### Step 1: Access Widget Library
1. Go to **Admin Menu** → **Widget Library**
2. Click **"Create Widget"** button

### Step 2: Basic Information
| Field | Description | Example |
|-------|-------------|---------|
| **Name** | What users see when adding this widget | "Temperature Display" |
| **Code** | Unique identifier (auto-generated) | "temp_display_v1" |
| **Category** | Group for organization | "Data Display" |
| **Description** | Help text for users | "Shows temperature with color coding" |

### Step 3: Choose Widget Type (Render Type)
Select how the widget will look:

| Type | Best For | Example Use |
|------|----------|-------------|
| **Value Display** | Single number | Temperature: 25°C |
| **Gauge** | Progress/level | Tank 75% full |
| **Line Chart** | Trends over time | Temperature history |
| **Status Indicator** | On/Off states | Device online/offline |
| **Counter** | Large numbers | Total events: 1,234 |

### Step 4: Configure Size
- **Default Width**: How wide (1-12 grid units)
- **Default Height**: How tall (1-10 grid units)
- **Min/Max limits**: Prevent users from resizing too small/large

---

## 📌 Parameter Slots - Connecting to Device Data

### What are Parameter Slots?

Parameter slots are **placeholders** that connect your widget to actual device data. When someone adds your widget to a dashboard, they'll choose which device measurement to display.

### How it Works

```
Your Widget Template          User's Dashboard
┌──────────────────┐         ┌──────────────────┐
│ Parameter Slot:  │  ──▶    │ Temperature: 25°C│
│ "Main Value"     │         │ (from Sensor #1) │
└──────────────────┘         └──────────────────┘
```

### Creating a Parameter Slot

| Field | What It Does | Example |
|-------|--------------|---------|
| **Slot Key** | Internal name (used in code) | `primary_value` |
| **Display Label** | What users see when configuring | "Temperature Reading" |
| **Data Types** | Limits which parameters can be selected | ☑️ Number ☐ String ☐ Boolean |
| **Required** | Must users select a parameter? | ☑️ Yes (widget won't work without it) |

### Common Slot Patterns

**Single Value Widget** (like a Temperature Card):
```
Slot 1: "Main Value" - Required, Number type
```

**Comparison Widget** (like Before/After):
```
Slot 1: "Value A" - Required, Number type
Slot 2: "Value B" - Required, Number type
```

**Status Widget** (like Online/Offline indicator):
```
Slot 1: "Status" - Required, Boolean type
```

---

## ⚙️ Settings - Customization Options

### What are Widget Settings?

Settings are **customization options** that users can change when adding a widget to their dashboard. Unlike parameter slots (which connect to live data), settings are static configurations.

### Examples of Common Settings

| Setting | Type | Purpose |
|---------|------|---------|
| Show Unit Label | Boolean (on/off) | Display "°C" after the value |
| Decimal Places | Number | Show "25.5" vs "25.50" |
| Icon | Icon picker | Choose thermometer, gauge, etc. |
| Background Color | Color | Make the card blue, green, etc. |
| Size | Select dropdown | Small, Medium, Large |

### Creating a Setting

| Field | What It Does |
|-------|--------------|
| **Key** | Internal name (e.g., `show_unit`) |
| **Label** | What users see (e.g., "Show Unit Label") |
| **Type** | String, Number, Boolean, Color, Icon, or Select |
| **Default** | Initial value if user doesn't change it |

---

## 🎨 Style Conditions - Dynamic Appearance

### What are Style Conditions?

Style conditions automatically change how the widget looks based on the **live data value**. This creates visual alerts without manual intervention.

### Example: Temperature Alerts

```
IF temperature > 30°C  →  Show RED background
IF temperature > 20°C  →  Show YELLOW background  
IF temperature ≤ 20°C  →  Show GREEN background
```

### Creating a Condition

1. **Select Parameter**: Which slot's value to check
2. **Choose Operator**: 
   - `>` Greater than
   - `<` Less than
   - `=` Equals
   - `≥` Greater or equal
   - `≤` Less or equal
3. **Set Threshold**: The value to compare against
4. **Define Styles**: What changes when condition is true
   - Text color
   - Background color
   - Border color
   - Icon

### Important Notes

⚠️ **Conditions require Parameter Slots**: You must define at least one parameter slot before you can create conditions based on its value.

⚠️ **Order matters**: Conditions are checked top-to-bottom. The first matching condition wins.

---

## 📂 Widget Categories

Categories organize widgets in the Dashboard Builder sidebar.

### Default Categories

| Category | Purpose | Example Widgets |
|----------|---------|-----------------|
| **Layout** | Structure & organization | Container, Section, Row |
| **Data Display** | Show single values | Parameter Card, Counter, Status Badge |
| **Visualization** | Charts & gauges | Line Chart, Tank Gauge, Circular Gauge |
| **Control** | User interaction | Threshold Editor, Recording Control |
| **Monitoring** | Alerts & logs | Alerts Panel, Audit Log |
| **Decorative** | Visual elements | Text Block, Logo, Icon |

### Creating Custom Categories

1. In Widget Library, click **"Categories"** button
2. Enter category name
3. Choose an icon (visual identifier)
4. Select a color (for the category badge)
5. Click **"Create Category"**

---

## 🔒 System vs Custom Widgets

### System Widgets
- Pre-built by SustainPro
- Cannot be edited or deleted
- Always available to all organizations
- Marked with "System" badge

### Custom Widgets
- Created by your organization
- Fully editable
- Can be deprecated or deleted
- Only visible to your organization

---

## 🔄 Widget Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        WIDGET LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────┘

  1. CREATE                2. USE                    3. UPDATE
  ┌──────────┐            ┌──────────┐             ┌──────────┐
  │ Widget   │  ────▶     │ Add to   │  ────▶     │ Edit in  │
  │ Library  │            │ Dashboard│             │ Library  │
  └──────────┘            └──────────┘             └──────────┘
       │                        │                        │
       │                        │                        │
       ▼                        ▼                        ▼
  Define slots,          Users bind to          Changes apply
  settings, and          actual device          to all future
  conditions             parameters             widget uses
```

---

## ❓ Frequently Asked Questions

### Q: My new widget doesn't appear in Dashboard Builder?
**A:** Make sure:
1. The widget is not marked as "Deprecated"
2. The category is correctly set
3. Refresh the page or wait a few seconds for the data to load

### Q: Can I delete a widget that's being used?
**A:** Deleting a widget will NOT remove it from existing dashboards, but users won't be able to add new instances.

### Q: How do I update all instances of a widget?
**A:** Edit the widget in Widget Library. Changes to name, description, and default settings will apply to new instances. Existing dashboard widgets keep their configured settings.

### Q: What's the difference between a Slot and a Setting?
**A:** 
- **Slot** = Live data from a device (changes constantly)
- **Setting** = User configuration (static choice)

---

## 🎓 Best Practices

1. **Use descriptive names**: "Water Tank Level %" is better than "Gauge 1"
2. **Add helpful descriptions**: Help users understand when to use each widget
3. **Set sensible defaults**: Make settings work out-of-the-box
4. **Use categories**: Group related widgets together
5. **Test thoroughly**: Add the widget to a test dashboard before deploying
6. **Document conditions**: Add notes about what each style condition means

---

## 📞 Need Help?

Contact your system administrator or refer to the Developer Documentation for advanced customization options.
