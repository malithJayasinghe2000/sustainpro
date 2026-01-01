# In-Memory Telemetry Storage - Memory Analysis

## Overview

This document analyzes the memory usage of the in-memory live telemetry storage system used in SustainPro.

## Data Structure

Each device entry in the `liveDataStore` Map:

```typescript
interface LiveDataEntry {
    data: any;           // Telemetry payload
    timestamp: Date;     // 8 bytes (Date object)
    device_id: number;   // 8 bytes (JS number)
    device_code: string; // Variable (e.g., "SPS_001" = ~14 bytes)
}
```

## Memory Calculation Per Device

### Fixed Overhead

| Item | Size |
|------|------|
| Map key (device_code string) | ~20 bytes |
| Object wrapper | ~32 bytes |
| timestamp (Date) | 8 bytes |
| device_id (number) | 8 bytes |
| device_code (string "SPS_XXX") | ~16 bytes |
| **Subtotal (fixed)** | **~84 bytes** |

### Telemetry Data Payload

Current payload sent by device:

```json
{
  "flow_rate": 5.0,
  "total_liters": 6.25,
  "bottles_avoided": 12,
  "co2_saved": 0.984
}
```

| Field | Size |
|-------|------|
| Object overhead | ~32 bytes |
| "flow_rate" key | ~20 bytes |
| flow_rate value (number) | 8 bytes |
| "total_liters" key | ~24 bytes |
| total_liters value (number) | 8 bytes |
| "bottles_avoided" key | ~30 bytes |
| bottles_avoided value (number) | 8 bytes |
| "co2_saved" key | ~20 bytes |
| co2_saved value (number) | 8 bytes |
| **Subtotal (data)** | **~158 bytes** |

### Total Per Device

| Component | Size |
|-----------|------|
| Fixed overhead | 84 bytes |
| Telemetry data | 158 bytes |
| V8 heap overhead (~20%) | ~48 bytes |
| **Total per device** | **~290 bytes** |

## Scaling Analysis

| Number of Devices | Memory Usage |
|-------------------|--------------|
| 1 device | ~290 bytes |
| 10 devices | ~2.9 KB |
| 100 devices | ~29 KB |
| 1,000 devices | ~290 KB |
| 10,000 devices | ~2.9 MB |
| 100,000 devices | ~29 MB |

## Key Points

### ✅ Memory Efficiency

1. **Only ONE entry per device** - We only store the latest reading, not history
2. **Overwrites old data** - Each new reading replaces the previous one
3. **No accumulation** - Memory stays constant regardless of time

### ✅ Memory Does NOT Grow With:
- Time (no historical data stored)
- Frequency of updates (each update replaces previous)
- Duration of operation

### ⚠️ Memory DOES Grow With:
- Number of unique devices connected
- Size of telemetry payload per device

## Comparison: In-Memory vs Database

| Metric | In-Memory | Database (every 1s) |
|--------|-----------|---------------------|
| Memory per device | ~290 bytes | ~0 bytes (on disk) |
| CPU per write | Minimal | Higher (disk I/O) |
| Latency | <1ms | 5-50ms |
| After 1 hour (1 device) | 290 bytes | 3,600 rows (~500 KB) |
| After 24 hours (1 device) | 290 bytes | 86,400 rows (~12 MB) |

## Recommendations

### For Small Deployments (< 1,000 devices)
- ✅ In-memory storage is perfect
- Memory usage < 300 KB
- No special configuration needed

### For Medium Deployments (1,000 - 10,000 devices)
- ✅ Still very manageable
- Memory usage 300 KB - 3 MB
- Consider monitoring with `process.memoryUsage()`

### For Large Deployments (> 10,000 devices)
- ⚠️ Consider Redis or dedicated cache
- Switch to WebSockets for true real-time
- Implement data aggregation/downsampling

## Monitoring Memory Usage

Add this endpoint to monitor actual memory usage:

```typescript
router.get('/stats', (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
        devices_in_memory: liveDataStore.size,
        estimated_bytes: liveDataStore.size * 290,
        heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
        heap_total_mb: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
    });
});
```

## Conclusion

For the current SustainPro deployment:

- **Memory per device**: ~290 bytes
- **With 100 devices**: ~29 KB total
- **Impact on server**: **Negligible** ✅

The in-memory approach is highly efficient for live telemetry because:
1. Only stores latest value (no history)
2. Overwrites on each update
3. No disk I/O overhead
4. Sub-millisecond access times

---

*Document created: 2025-12-12*
*Analysis based on SustainPro telemetry structure*
