# List Pieces: Swipe Action Row 📬

A physics-driven, custom swipe-action row component for **SwiftUI (iOS 17+)** and **React (Framer Motion + Tailwind)**. Wraps any row in a soft card with swipe actions rendered as high-contrast solid color blocks.

Unlike SwiftUI's native `.swipeActions` which only works inside `List`, `SwipeActionRow` runs anywhere: in a plain `VStack`, `ScrollView`, or `LazyVStack`.

---

## ✨ Features

- **Solid Color Block Action Tiles**: Bold, tactile action blocks (Sky Blue `#9cc2ff`, Tangerine Red `#ff0000`, Butter Yellow `#ffd976`, Sage Green `#a9dcb7`) designed with dark ink (`#141414`) for 4.5:1 contrast.
- **Dynamic Tile Growth & Scale**: As the row slides open, the icon smoothly expands from 55% to 100% scale and the label fades in past 45% reveal so peeking never shows an awkwardly cropped glyph.
- **Full-Swipe Arming & Bar Expansion**: Dragging past 60% of the row width triggers a haptic impact click (`.sensoryFeedback(.impact)`) and expands the edge action block to consume the entire bar with spring physics. Releasing fires the action immediately.
- **Rubber-Band Drag Resistance**: Swiping in a direction with no assigned actions applies natural rubber-band resistance curve (`40 * (1 - 1 / (1 + x / 40))`).
- **Dynamic Card Lift & Shadow**: The sliding card dynamically casts a directional lift shadow (`14pt` radius, `0.16 * lift` opacity) that deepens with drag offset, clearly reading as a floating layer above the action blocks.
- **Mutually Exclusive Row Orchestration**: Pass a shared `open: $openID` binding so swiping any row automatically and smoothly snaps all other rows shut.
- **Tap-to-Close**: Tapping anywhere on an opened row card smoothly springs it closed.
- **Accessibility & Reduce Motion**: Fully supports system Reduce Motion preferences and registers VoiceOver accessibility actions for every tile.

---

## 🚀 Quick Start (SwiftUI)

### 1. Copy `SwipeActionRow.swift`
Drop [`Sources/SwipeActionRow.swift`](Sources/SwipeActionRow.swift) directly into your Xcode project. No SPM packages or third-party dependencies required.

### 2. Usage Example

```swift
import SwiftUI

struct Message: Identifiable {
    let id: String
    let initials: String
    let name: String
    let subject: String
    let time: String
    let avatarColor: Color
}

struct InboxView: View {
    @State private var openID: AnyHashable? = nil
    
    @State private var messages: [Message] = [
        Message(id: "1", initials: "MA", name: "Mara Lindqvist", subject: "Final cut of the launch film", time: "9:41", avatarColor: Color(red: 0.914, green: 0.835, blue: 0.702)),
        Message(id: "2", initials: "JO", name: "Jonas Okafor", subject: "Studio booking for Thursday", time: "8:12", avatarColor: Color(red: 0.663, green: 0.863, blue: 0.718)),
        Message(id: "3", initials: "PR", name: "Priya Raman", subject: "Notes from the pricing review", time: "Mon", avatarColor: Color(red: 0.804, green: 0.722, blue: 1))
    ]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(messages) { message in
                    SwipeActionRow(
                        id: message.id,
                        leading: [
                            .init("Read", systemImage: "envelope.open", tint: Color(red: 0.612, green: 0.761, blue: 1)) {
                                print("Marked \(message.name) as read")
                            }
                        ],
                        trailing: [
                            .init("Delete", systemImage: "trash", tint: Color(red: 1, green: 0, blue: 0), role: .destructive) {
                                withAnimation {
                                    messages.removeAll { $0.id == message.id }
                                }
                            },
                            .init("Snooze", systemImage: "moon.zzz", tint: Color(red: 1, green: 0.851, blue: 0.463)) {
                                print("Snoozed \(message.name)")
                            }
                        ],
                        open: $openID
                    ) {
                        HStack(spacing: 14) {
                            Text(message.initials)
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundStyle(Color(red: 0.078, green: 0.078, blue: 0.078))
                                .frame(width: 46, height: 46)
                                .background(message.avatarColor, in: Circle())
                            
                            VStack(alignment: .leading, spacing: 3) {
                                Text(message.name).font(.headline)
                                Text(message.subject).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                            }
                            
                            Spacer(minLength: 8)
                            Text(message.time).font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                }
            }
            .padding(20)
        }
    }
}
```

---

## 🌐 Web / React (Framer Motion + Tailwind)

A drop-in React TypeScript component is provided in [`Web/SwipeActionRow.tsx`](Web/SwipeActionRow.tsx):

```tsx
import { SwipeActionRow } from "./Web/SwipeActionRow";

export function InboxList() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <SwipeActionRow
        id="msg-1"
        openId={openId}
        onOpenChange={setOpenId}
        leading={[
          {
            title: "Read",
            tint: "#9cc2ff",
            icon: <EnvelopeIcon />,
            onAction: () => console.log("Mark as read")
          }
        ]}
        trailing={[
          {
            title: "Delete",
            tint: "#ff0000",
            icon: <TrashIcon />,
            role: "destructive",
            onAction: () => console.log("Delete item")
          },
          {
            title: "Snooze",
            tint: "#ffd976",
            icon: <MoonIcon />,
            onAction: () => console.log("Snooze item")
          }
        ]}
      >
        <div className="p-4 flex items-center gap-3">
          <span className="font-bold">Mara Lindqvist</span>
        </div>
      </SwipeActionRow>
    </div>
  );
}
```

### Zero-Build Interactive HTML Demo
Double-click [`index.html`](index.html) in your browser to test live swipe actions, sound effects, full-swipe deletion, and dark/light themes.

---

## 🎨 Style Customization (`SwipeActionRowStyle`)

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `surface` | `Color` | Adaptive `#ffffff` / `#1c1c1c` | Background card surface fill |
| `tileInk` | `Color` | `#141414` | High contrast glyph and title color |
| `cornerRadius` | `CGFloat` | `26` | Card and action tile corner radius |
| `tileWidth` | `CGFloat` | `78` | Width of an individual action block |
| `tileGap` | `CGFloat` | `6` | Gap between card and tiles, and between tiles |

---

## 📄 License

MIT License. Free to use, adapt, and customize in personal or commercial apps.
