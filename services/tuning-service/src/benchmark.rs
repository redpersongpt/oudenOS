// ─── Benchmark Engine ────────────────────────────────────────────────────────
// Runs real system benchmarks and stores results in SQLite for comparison.
// Metrics are actual measurements, not synthetic estimates.

use crate::db::Database;

/// Run a benchmark suite and persist results.
pub async fn run_benchmark(
    db: &Database,
    device_profile_id: &str,
    benchmark_type: &str,
    _config: &serde_json::Value,
    tags: &[String],
) -> anyhow::Result<serde_json::Value> {
    let id = uuid::Uuid::new_v4().to_string();
    let started_at = chrono::Utc::now().to_rfc3339();

    tracing::info!("Running {} benchmark (id: {})", benchmark_type, id);

    let metrics = match benchmark_type {
        "system_latency" => run_system_latency_benchmark(),
        "storage_speed" => run_storage_benchmark(),
        "memory_latency" => run_memory_benchmark(),
        _ => {
            tracing::warn!("Unknown benchmark type: {}, running system_latency", benchmark_type);
            run_system_latency_benchmark()
        }
    };

    let completed_at = chrono::Utc::now().to_rfc3339();

    let result = serde_json::json!({
        "id": id,
        "deviceProfileId": device_profile_id,
        "type": benchmark_type,
        "config": {},
        "status": "completed",
        "startedAt": started_at,
        "completedAt": completed_at,
        "metrics": metrics,
        "rawDataPath": null,
        "tags": tags,
        "tuningPlanId": null,
        "error": null
    });

    // Persist
    let data = serde_json::to_string(&result)?;
    db.conn().execute(
        "INSERT INTO benchmark_results (id, device_profile_id, type, status, started_at, completed_at, data)
         VALUES (?1, ?2, ?3, 'completed', ?4, ?5, ?6)",
        rusqlite::params![id, device_profile_id, benchmark_type, started_at, completed_at, data],
    )?;

    // Audit
    let audit_id = uuid::Uuid::new_v4().to_string();
    let _ = db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'benchmark', 'benchmark_completed', ?3, 'info')",
        rusqlite::params![audit_id, completed_at, format!("Benchmark {} completed: {} metrics", benchmark_type, metrics.len())],
    );

    Ok(result)
}

/// List all benchmark results, optionally filtered by device profile.
pub fn list_benchmarks(
    db: &Database,
    device_profile_id: Option<&str>,
) -> anyhow::Result<serde_json::Value> {
    let mut results = Vec::new();

    if let Some(dpid) = device_profile_id {
        let mut stmt = db.conn().prepare(
            "SELECT data FROM benchmark_results WHERE device_profile_id = ?1 ORDER BY started_at DESC"
        )?;
        let rows = stmt.query_map(rusqlite::params![dpid], |row| {
            let data: String = row.get(0)?;
            Ok(data)
        })?;
        for row in rows {
            if let Ok(data) = row {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    results.push(parsed);
                }
            }
        }
    } else {
        let mut stmt = db.conn().prepare(
            "SELECT data FROM benchmark_results ORDER BY started_at DESC LIMIT 100"
        )?;
        let rows = stmt.query_map([], |row| {
            let data: String = row.get(0)?;
            Ok(data)
        })?;
        for row in rows {
            if let Ok(data) = row {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&data) {
                    results.push(parsed);
                }
            }
        }
    }

    Ok(serde_json::json!(results))
}

/// Compare two benchmark results.
pub fn compare_benchmarks(
    db: &Database,
    baseline_id: &str,
    comparison_id: &str,
) -> anyhow::Result<serde_json::Value> {
    let load = |id: &str| -> anyhow::Result<serde_json::Value> {
        let data: String = db.conn().query_row(
            "SELECT data FROM benchmark_results WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )?;
        Ok(serde_json::from_str(&data)?)
    };

    let baseline = load(baseline_id)?;
    let comparison = load(comparison_id)?;

    let baseline_metrics = baseline.get("metrics").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let comparison_metrics = comparison.get("metrics").and_then(|v| v.as_array()).cloned().unwrap_or_default();

    let mut diffs = Vec::new();
    for bm in &baseline_metrics {
        let name = bm.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let bval = bm.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0);

        if let Some(cm) = comparison_metrics.iter().find(|m| m.get("name").and_then(|v| v.as_str()) == Some(name)) {
            let cval = cm.get("value").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let delta = cval - bval;
            let pct = if bval.abs() > 0.001 { (delta / bval) * 100.0 } else { 0.0 };

            diffs.push(serde_json::json!({
                "metric": name,
                "baseline": bval,
                "comparison": cval,
                "delta": delta,
                "deltaPercent": (pct * 100.0).round() / 100.0,
                "unit": bm.get("unit").cloned().unwrap_or(serde_json::Value::Null),
                "betterDirection": bm.get("betterDirection").cloned().unwrap_or(serde_json::Value::Null),
            }));
        }
    }

    Ok(serde_json::json!({
        "baselineId": baseline_id,
        "comparisonId": comparison_id,
        "baselineType": baseline.get("type"),
        "comparisonType": comparison.get("type"),
        "diffs": diffs,
    }))
}

// ─── Real measurements ──────────────────────────────────────────────────────

fn run_system_latency_benchmark() -> Vec<serde_json::Value> {
    let mut metrics = Vec::new();

    // 1. Timer resolution measurement: time how long Sleep(1) actually takes
    let mut sleep_samples = Vec::new();
    for _ in 0..100 {
        let start = std::time::Instant::now();
        std::thread::sleep(std::time::Duration::from_millis(1));
        sleep_samples.push(start.elapsed().as_micros() as f64);
    }
    sleep_samples.sort_by(|a, b| a.total_cmp(b));
    let median_sleep = sleep_samples[50];
    let p99_sleep = sleep_samples[99];

    metrics.push(serde_json::json!({
        "name": "sleep1_median_us",
        "value": median_sleep,
        "unit": "us",
        "betterDirection": "lower",
        "description": "Median actual duration of Sleep(1ms) — measures timer resolution"
    }));
    metrics.push(serde_json::json!({
        "name": "sleep1_p99_us",
        "value": p99_sleep,
        "unit": "us",
        "betterDirection": "lower",
        "description": "P99 duration of Sleep(1ms) — measures timer jitter"
    }));

    // 2. Thread spawn latency: how long to spawn + join a thread
    let mut spawn_samples = Vec::new();
    for _ in 0..50 {
        let start = std::time::Instant::now();
        let handle = std::thread::spawn(|| {});
        if let Err(e) = handle.join() {
            tracing::warn!("Benchmark spawn thread panicked: {:?}", e);
        }
        spawn_samples.push(start.elapsed().as_micros() as f64);
    }
    spawn_samples.sort_by(|a, b| a.total_cmp(b));
    let median_spawn = spawn_samples[25];

    metrics.push(serde_json::json!({
        "name": "thread_spawn_median_us",
        "value": median_spawn,
        "unit": "us",
        "betterDirection": "lower",
        "description": "Median thread spawn+join latency"
    }));

    // 3. Clock monotonicity check + overhead
    let mut clock_samples = Vec::new();
    for _ in 0..1000 {
        let start = std::time::Instant::now();
        let _ = std::time::Instant::now();
        clock_samples.push(start.elapsed().as_nanos() as f64);
    }
    clock_samples.sort_by(|a, b| a.total_cmp(b));
    let median_clock = clock_samples[500];

    metrics.push(serde_json::json!({
        "name": "clock_read_median_ns",
        "value": median_clock,
        "unit": "ns",
        "betterDirection": "lower",
        "description": "Median Instant::now() read overhead"
    }));

    metrics
}

fn run_storage_benchmark() -> Vec<serde_json::Value> {
    let mut metrics = Vec::new();

    // Sequential write: write 10MB in 4KB blocks
    let temp_path = std::env::temp_dir().join("redcore-bench-seq.tmp");
    let data = vec![0xABu8; 4096];
    let blocks = 2560; // 2560 * 4KB = 10MB

    let start = std::time::Instant::now();
    if let Ok(mut f) = std::fs::File::create(&temp_path) {
        use std::io::Write;
        for _ in 0..blocks {
            let _ = f.write_all(&data);
        }
        let _ = f.sync_all();
    }
    let write_elapsed = start.elapsed();
    let write_mbps = 10.0 / write_elapsed.as_secs_f64();

    metrics.push(serde_json::json!({
        "name": "seq_write_mbps",
        "value": (write_mbps * 10.0).round() / 10.0,
        "unit": "MB/s",
        "betterDirection": "higher",
        "description": "Sequential write speed (10MB in 4KB blocks)"
    }));

    // Sequential read
    let start = std::time::Instant::now();
    if let Ok(mut f) = std::fs::File::open(&temp_path) {
        use std::io::Read;
        let mut buf = vec![0u8; 4096];
        for _ in 0..blocks {
            let _ = f.read_exact(&mut buf);
        }
    }
    let read_elapsed = start.elapsed();
    let read_mbps = 10.0 / read_elapsed.as_secs_f64();

    metrics.push(serde_json::json!({
        "name": "seq_read_mbps",
        "value": (read_mbps * 10.0).round() / 10.0,
        "unit": "MB/s",
        "betterDirection": "higher",
        "description": "Sequential read speed (10MB in 4KB blocks)"
    }));

    let _ = std::fs::remove_file(&temp_path);

    // Random 4K write: create 1000 random 4K files
    let bench_dir = std::env::temp_dir().join("redcore-bench-rnd");
    let _ = std::fs::create_dir_all(&bench_dir);
    let start = std::time::Instant::now();
    for i in 0..1000 {
        if let Ok(mut f) = std::fs::File::create(bench_dir.join(format!("{}.tmp", i))) {
            use std::io::Write;
            let _ = f.write_all(&data);
        }
    }
    let rnd_elapsed = start.elapsed();
    let iops = 1000.0 / rnd_elapsed.as_secs_f64();

    metrics.push(serde_json::json!({
        "name": "random_4k_write_iops",
        "value": (iops).round(),
        "unit": "IOPS",
        "betterDirection": "higher",
        "description": "Random 4K file create operations per second"
    }));

    let _ = std::fs::remove_dir_all(&bench_dir);

    metrics
}

fn run_memory_benchmark() -> Vec<serde_json::Value> {
    let mut metrics = Vec::new();

    // Memory allocation throughput: alloc+dealloc 1MB blocks
    let start = std::time::Instant::now();
    for _ in 0..1000 {
        let v: Vec<u8> = vec![0; 1024 * 1024];
        std::hint::black_box(&v);
    }
    let alloc_elapsed = start.elapsed();
    let alloc_gbps = (1000.0 * 1.0) / alloc_elapsed.as_secs_f64() / 1024.0;

    metrics.push(serde_json::json!({
        "name": "alloc_throughput_gbps",
        "value": (alloc_gbps * 100.0).round() / 100.0,
        "unit": "GB/s",
        "betterDirection": "higher",
        "description": "Memory allocation throughput (1MB blocks)"
    }));

    // Sequential memory read: read through 64MB buffer
    let buf: Vec<u8> = vec![1; 64 * 1024 * 1024];
    let start = std::time::Instant::now();
    let mut sum: u64 = 0;
    for chunk in buf.chunks(64) {
        sum = sum.wrapping_add(chunk[0] as u64);
    }
    std::hint::black_box(sum);
    let read_elapsed = start.elapsed();
    let read_gbps = 64.0 / 1024.0 / read_elapsed.as_secs_f64();

    metrics.push(serde_json::json!({
        "name": "mem_read_gbps",
        "value": (read_gbps * 100.0).round() / 100.0,
        "unit": "GB/s",
        "betterDirection": "higher",
        "description": "Sequential memory read throughput (64MB)"
    }));

    metrics
}
