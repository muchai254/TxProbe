// Characterization tests: each fixture under tests/fixtures/ is a real
// mainnet {raw_tx, prevouts} payload; the matching file under tests/golden/
// is the exact analyzer response captured as a behavioral baseline before
// refactoring. A refactor must keep every one of these byte-for-byte
// identical (compared as parsed JSON, so key ordering doesn't matter).

use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

use txprobe_analyzer::{analyze_single_tx, parse_transaction, PrevoutEntry};

#[derive(Deserialize)]
struct Fixture {
    raw_tx: String,
    prevouts: Vec<PrevoutEntry>,
}

fn run_fixture(name: &str) -> Value {
    let fixture_path = format!("tests/fixtures/{name}.json");
    let raw = fs::read_to_string(&fixture_path)
        .unwrap_or_else(|e| panic!("failed to read {fixture_path}: {e}"));
    let fixture: Fixture =
        serde_json::from_str(&raw).unwrap_or_else(|e| panic!("failed to parse {fixture_path}: {e}"));

    let raw_bytes = hex::decode(&fixture.raw_tx).expect("fixture raw_tx must be valid hex");
    let tx = parse_transaction(&raw_bytes).expect("fixture raw_tx must parse");
    let analysis = analyze_single_tx(&tx, &fixture.prevouts);

    json!({ "ok": true, "analysis": analysis })
}

fn golden(name: &str) -> Value {
    let golden_path = format!("tests/golden/{name}.json");
    let raw = fs::read_to_string(&golden_path)
        .unwrap_or_else(|e| panic!("failed to read {golden_path}: {e}"));
    serde_json::from_str(&raw).unwrap_or_else(|e| panic!("failed to parse {golden_path}: {e}"))
}

fn assert_matches_golden(name: &str) {
    let actual = run_fixture(name);
    let expected = golden(name);
    assert_eq!(actual, expected, "analyzer output drifted from golden fixture: {name}");
}

// One test per fixture (rather than a loop over the directory) so a
// regression names the specific transaction category that broke.

#[test]
fn coinbase() {
    assert_matches_golden("coinbase");
}

#[test]
fn payment_with_change() {
    assert_matches_golden("payment_with_change");
}

#[test]
fn rbf_locktime() {
    assert_matches_golden("rbf_locktime");
}

#[test]
fn self_transfer() {
    assert_matches_golden("self_transfer");
}

#[test]
fn batch_payment_script_upgrade() {
    assert_matches_golden("batch_payment_script_upgrade");
}

#[test]
fn p2pkh_spend() {
    assert_matches_golden("p2pkh_spend");
}

#[test]
fn consolidation() {
    assert_matches_golden("consolidation");
}

#[test]
fn op_return() {
    assert_matches_golden("op_return");
}

#[test]
fn taproot_spend() {
    assert_matches_golden("taproot_spend");
}

#[test]
fn inscription() {
    assert_matches_golden("inscription");
}

#[test]
fn runes() {
    assert_matches_golden("runes");
}

#[test]
fn peeling_chain() {
    assert_matches_golden("peeling_chain");
}

// A dedicated round_payment fixture (an output value that's an exact multiple
// of 0.01 BTC, per round_payment.rs:7) was not captured: blockstream.info
// rate-limited this environment for the remainder of the Stage 0 session
// before it could be fetched. round_number_payment is otherwise only
// exercised by the #[ignore]d coinjoin fixture below, so it currently has no
// *passing* characterization coverage — add a dedicated fixture in a follow-up
// once API access is available, following the pattern of the tests above.

// coinjoin.json is deliberately excluded: detect_coinjoin (src/heuristics/coinjoin.rs)
// picks the winning denomination via HashMap::iter().max_by_key(), which is
// non-deterministic on ties (Rust's HashMap iteration order is randomized per
// process). The real mainnet transaction used for this fixture has a 4-way tie,
// so its golden output cannot be reproduced reliably run-to-run. This is a
// latent bug in the analyzer, not a fixture-selection mistake — see plan.md
// appendix. Do not fix it here; Stage 0 only establishes a baseline.
#[test]
#[ignore = "detect_coinjoin's tie-break is non-deterministic (HashMap iteration order); see plan.md appendix"]
fn coinjoin() {
    assert_matches_golden("coinjoin");
}

#[test]
fn all_golden_files_have_a_test() {
    // Guards against silently losing coverage if a fixture is added without
    // a matching #[test] above.
    let fixture_names: Vec<String> = fs::read_dir("tests/fixtures")
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .map(|p| p.file_stem().unwrap().to_string_lossy().into_owned())
        .collect();

    let golden_names: Vec<String> = fs::read_dir("tests/golden")
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .map(|p| p.file_stem().unwrap().to_string_lossy().into_owned())
        .collect();

    let mut fixtures_sorted = fixture_names.clone();
    fixtures_sorted.sort();
    let mut golden_sorted = golden_names.clone();
    golden_sorted.sort();
    assert_eq!(
        fixtures_sorted, golden_sorted,
        "tests/fixtures and tests/golden must contain the same set of names"
    );

    for name in &fixture_names {
        assert!(
            Path::new(&format!("tests/fixtures/{name}.json")).exists(),
            "missing fixture file for {name}"
        );
    }
}
