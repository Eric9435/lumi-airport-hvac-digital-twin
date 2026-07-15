# LUMI Nexus Replay Control Console

## Route

```text
/nexus/replay
Purpose

The Operational Replay Console provides browser-based control over the
synchronized 24-hour Nexus dataset timeline.

The console does not connect to or operate physical airport equipment.

Controls
Play
Pause
Previous snapshot
Next snapshot
Reset
Timeline scrubber
Replay-speed selection
Virtual Timeline
Property	Value
Duration	24 hours
Interval	10 minutes
Snapshots	144
Domain datasets	10
Rows per snapshot	89
Data origin	Simulated
Physical control	Disabled
Replay Speeds
Replay speed	Real duration per 10-minute snapshot	Approximate full-day duration
60×	10 seconds	24 minutes
120×	5 seconds	12 minutes
600×	1 second	2 minutes 24 seconds
1200×	0.5 seconds	1 minute 12 seconds
Runtime Boundary

Replay state is maintained in the browser.

The server API remains deterministic and stateless:

GET /api/nexus/replay?index=<0-143>

This prevents a browser replay session from changing physical control
state or silently affecting another operator session.
```
