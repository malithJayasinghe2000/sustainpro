# Dynamic Widget System Architecture

## Overview

The Dynamic Widget System allows Super Admins to create, configure, and manage custom widgets that can be used across different device models and dashboards. This eliminates the need for hardcoded widget types and provides maximum flexibility.

## Core Concepts

### 1. Widget Definitions
A widget definition is a reusable template that defines:
- **Visual Properties**: Size, colors, icons, borders, shadows
- **Behavior**: How it displays data, animations, interactions
- **Parameter Slots**: Configurable slots that can be mapped to any device parameter
- **Rendering Type**: The base visualization type (gauge, card, chart, etc.)

### 2. Widget Categories
- **Data Display**: Show parameter values (cards, counters, badges)
- **Visualizations**: Charts, gauges, tanks, meters
- **Controls**: Buttons, sliders, toggles for device control
- **Layout**: Containers, sections, grids
- **Decorative**: Text, images, icons, backgrounds

### 3. Rendering Types (Base Components)
These are the foundational rendering engines that can be configured:
- `value_display` - Shows a value with optional icon, unit, label
- `gauge_circular` - Circular gauge with configurable ranges
- `gauge_linear` - Linear/horizontal gauge
- `tank_visual` - Tank/container fill visualization
- `chart_line` - Time series line chart
- `chart_bar` - Bar chart
- `status_badge` - Status indicator
- `progress_bar` - Progress/completion bar
- `icon_value` - Large icon with value
- `table_data` - Tabular data display
- `container` - Layout container for nesting
- `custom_svg` - Custom SVG-based visualization

### 4. Parameter Slots
Each widget can define multiple parameter slots:
```json
{
  "slots": [
    {
      "key": "primary_value",
      "label": "Main Value",
      "required": true,
      "data_types": ["number"],
      "description": "The primary value to display"
    },
    {
      "key": "secondary_value", 
      "label": "Secondary Value",
      "required": false,
      "data_types": ["number", "string"]
    },
    {
      "key": "status",
      "label": "Status Indicator",
      "required": false,
      "data_types": ["boolean", "string"]
    }
  ]
}
```

### 5. Conditional Styling
Widgets can define conditional styles based on values:
```json
{
  "conditions": [
    {
      "slot": "primary_value",
      "operator": "lt",
      "value": 20,
      "styles": { "color": "#22C55E" }
    },
    {
      "slot": "primary_value", 
      "operator": "between",
      "value": [20, 80],
      "styles": { "color": "#F59E0B" }
    },
    {
      "slot": "primary_value",
      "operator": "gt",
      "value": 80,
      "styles": { "color": "#EF4444" }
    }
  ]
}
```

## Database Schema

### sps_widget_definitions
Stores the widget definitions created by admins.

### sps_widget_categories
Categories for organizing widgets.

### sps_widget_presets
Pre-configured instances of widget definitions for quick use.

## API Endpoints

### Widget Definitions
- `GET /api/v1/widget-definitions` - List all definitions
- `POST /api/v1/widget-definitions` - Create new definition
- `GET /api/v1/widget-definitions/:id` - Get definition
- `PUT /api/v1/widget-definitions/:id` - Update definition
- `DELETE /api/v1/widget-definitions/:id` - Delete definition

### Widget Categories
- `GET /api/v1/widget-categories` - List categories
- `POST /api/v1/widget-categories` - Create category

## Frontend Components

### DynamicWidgetRenderer
Takes a widget definition + parameter mappings and renders the widget.

### WidgetDefinitionBuilder
UI for Super Admins to create/edit widget definitions.

### WidgetLibrary
Shows available widgets from database instead of hardcoded list.

## Migration Path
1. Create database tables
2. Seed default widgets based on current hardcoded types
3. Update Dashboard Builder to use dynamic widgets
4. Create admin UI for widget management
