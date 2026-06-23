mod address;
mod crypto;
mod heuristics;
mod script;
mod tx;
mod varint;

use heuristics::{analyze_single_tx, PrevoutEntry};
use serde::Deserialize;
use serde_json::json;
use std::io::{self, Read};
use tx::parse_transaction;

#[derive(Deserialize)]
struct Input {
    raw_tx: String,
    prevouts: Vec<PrevoutEntry>,
}

fn main() {
    let mut buf = String::new();
    io::stdin().read_to_string(&mut buf).expect("read stdin");

    let input: Input = match serde_json::from_str(&buf) {
        Ok(v) => v,
        Err(e) => {
            let out = json!({ "ok": false, "error": format!("JSON parse error: {}", e) });
            println!("{}", out);
            return;
        }
    };

    let raw_bytes = match hex::decode(&input.raw_tx) {
        Ok(b) => b,
        Err(e) => {
            let out = json!({ "ok": false, "error": format!("Hex decode error: {}", e) });
            println!("{}", out);
            return;
        }
    };

    let parsed = match parse_transaction(&raw_bytes) {
        Ok(tx) => tx,
        Err(e) => {
            let out = json!({ "ok": false, "error": format!("Parse error: {}", e) });
            println!("{}", out);
            return;
        }
    };

    let analysis = analyze_single_tx(&parsed, &input.prevouts);
    let out = json!({ "ok": true, "analysis": analysis });
    println!("{}", out);
}
