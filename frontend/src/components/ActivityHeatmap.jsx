import { useMemo, useState, useEffect, useRef } from "react";
import {
  startOfDay,
  subMonths,
  addDays,
  addWeeks,
  format,
  startOfWeek,
  isSameMonth,
} from "date-fns";
import { t } from "../i18n";
import { formatDateFnsLocale, formatLocaleDuration, getLocale } from "../utils/formatLocale";

const CELL_SIZE = 14;
const GAP = 4;
const COL_WIDTH = CELL_SIZE + GAP; // 18px per week column
const DAY_LABEL_WIDTH = 28;
const WEEK_STARTS_ON = 1; // Monday
const TARGET_WEEKS = 52; // 12 months ≈ 52 weeks

// Activity heatmap: last 12 months, GitHub-style (7 rows = days, cols = weeks)
// Unified: scroll + fixed cell sizes in both profile and modal
const ActivityHeatmap = ({ heatmap = {} }) => {
  const [tooltip, setTooltip] = useState(null);
  const [langVersion, setLangVersion] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handler = () => setLangVersion((v) => v + 1);
    window.addEventListener("languagechange", handler);
    return () => window.removeEventListener("languagechange", handler);
  }, []);

  const { grid, months, maxHours } = useMemo(() => {
    const end = startOfDay(new Date());
    const start = startOfWeek(subMonths(end, 12), { weekStartsOn: WEEK_STARTS_ON });
    const maxHours = Math.max(
      1,
      ...Object.values(heatmap).filter((h) => h > 0)
    );

    // Build grid: 7 rows (Mon-Sun), N columns (weeks) - last 12 months
    const weeks = [];
    let weekStart = new Date(start);
    while (weekStart <= end) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        const dateStr = format(date, "yyyy-MM-dd");
        const hours = heatmap[dateStr] ?? 0;
        week.push({ date, dateStr, hours });
      }
      weeks.push(week);
      weekStart = addDays(weekStart, 7);
    }

    // Pad with future empty weeks to reach TARGET_WEEKS (centering / filled block)
    while (weeks.length < TARGET_WEEKS) {
      const lastWeek = weeks[weeks.length - 1];
      const nextWeekStart = addWeeks(lastWeek[0]?.date ?? end, 1);
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(nextWeekStart, d);
        week.push({ date, dateStr: format(date, "yyyy-MM-dd"), hours: 0 });
      }
      weeks.push(week);
    }

    // Month labels: colIndex, span (weeks in month), label
    const monthLabels = [];
    let lastMonthStart = 0;
    weeks.forEach((week, colIndex) => {
      const firstDay = week[0]?.date;
      const prevFirstDay = colIndex > 0 ? weeks[colIndex - 1][0]?.date : null;
      const isNewMonth =
        !prevFirstDay || (firstDay && !isSameMonth(firstDay, prevFirstDay));

      if (isNewMonth && firstDay) {
        if (monthLabels.length > 0) {
          monthLabels[monthLabels.length - 1].span = colIndex - lastMonthStart;
        }
        monthLabels.push({
          colIndex,
          span: 1,
          label: formatDateFnsLocale(firstDay, "MMM"),
        });
        lastMonthStart = colIndex;
      }
    });
    if (monthLabels.length > 0) {
      monthLabels[monthLabels.length - 1].span = weeks.length - lastMonthStart;
    }

    return { grid: weeks, months: monthLabels, maxHours };
  }, [heatmap, langVersion]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };
    scrollToEnd();
    requestAnimationFrame(scrollToEnd);
    const t = setTimeout(scrollToEnd, 100);
    return () => clearTimeout(t);
  }, [grid, heatmap]);

  const getCellClass = (hours) => {
    if (!hours || hours <= 0) return "activity-heatmap-cell--empty";
    const intensity = Math.min(1, hours / maxHours);
    if (intensity <= 0.4) return "activity-heatmap-cell--active-low";
    if (intensity <= 0.7) return "activity-heatmap-cell--active-mid";
    return "activity-heatmap-cell--active-high";
  };

  const formatTooltipDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(getLocale(), {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const dayLabels = [
    { index: 0, key: "dayMon" },
    { index: 2, key: "dayWed" },
    { index: 4, key: "dayFri" },
  ];

  if (grid.length === 0) return null;

  const numWeeks = grid.length;
  const gridWidth = numWeeks * COL_WIDTH - GAP;

  return (
    <div
      ref={scrollRef}
      className="activity-heatmap activity-heatmap-scroll"
      style={styles.outer}
    >
      <div style={styles.centerWrapper}>
        <div
          style={{
            ...styles.container,
            gridTemplateColumns: `${DAY_LABEL_WIDTH}px ${gridWidth}px`,
            gridTemplateAreas: '"empty months" "days grid"',
          }}
        >
          {/* Empty corner above day labels */}
          <div style={styles.empty} />

          {/* Month row - same CSS Grid as heatmap, grid-column for alignment */}
          <div
            style={{
              ...styles.monthsArea,
              gridTemplateColumns: `repeat(${numWeeks}, ${CELL_SIZE}px)`,
              gap: GAP,
            }}
          >
            {months.map(({ colIndex, span, label }) => (
              <div
                key={`${colIndex}-${label}`}
                className="activity-heatmap-month"
                style={{
                  ...styles.monthLabel,
                  gridColumnStart: colIndex + 1,
                  gridColumnEnd: "span " + span,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day labels - height 12px, flex center, same gap as grid */}
          <div
            style={{
              ...styles.daysArea,
              gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
              gap: GAP,
            }}
          >
          {Array.from({ length: 7 }, (_, rowIndex) => {
            const label = dayLabels.find((d) => d.index === rowIndex);
            return (
              <div key={rowIndex} className="activity-heatmap-day" style={styles.dayLabel}>
                {label ? t(`profile.${label.key}`) : ""}
              </div>
            );
          })}
        </div>

        {/* Heatmap grid - fixed cell sizes */}
        <div style={styles.gridArea}>
          <div style={styles.grid}>
            {/* Column-major order for grid-auto-flow: column */}
            {grid.map((week, colIndex) =>
              week.map((cell, rowIndex) => {
                const { dateStr, hours } = cell;
                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    className={`activity-heatmap-cell ${getCellClass(hours)}`}
                    style={styles.cell}
                    onMouseEnter={(e) => {
                      setTooltip({
                        dateStr,
                        hours,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          style={{
            ...styles.tooltip,
            left: tooltip.x,
            top: tooltip.y,
          }}
          className="activity-heatmap-tooltip"
        >
          <div style={styles.tooltipDate}>
            {formatTooltipDate(tooltip.dateStr)}
          </div>
          <div style={styles.tooltipHours}>
            {tooltip.hours > 0
              ? formatLocaleDuration(tooltip.hours)
              : t("profile.noHours")}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  outer: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 10,
    WebkitOverflowScrolling: "touch",
  },
  centerWrapper: {
    width: "max-content",
    minWidth: 700,
    margin: "0 auto",
  },
  container: {
    display: "grid",
    gap: 0,
    width: "fit-content",
    minWidth: "min-content",
    flexShrink: 0,
  },
  empty: {
    gridArea: "empty",
    width: DAY_LABEL_WIDTH,
    height: 18,
    marginBottom: 4,
  },
  monthsArea: {
    gridArea: "months",
    display: "grid",
    gridTemplateRows: "1fr",
    height: 18,
    marginBottom: 4,
    alignItems: "end",
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  daysArea: {
    gridArea: "days",
    display: "grid",
    width: DAY_LABEL_WIDTH,
    marginRight: 8,
  },
  dayLabel: {
    fontSize: 10,
    height: CELL_SIZE,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  gridArea: {
    gridArea: "grid",
    width: "fit-content",
  },
  grid: {
    display: "grid",
    gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
    gridAutoFlow: "column",
    gridAutoColumns: `${CELL_SIZE}px`,
    gap: GAP,
    width: "fit-content",
    flexShrink: 0,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    minWidth: CELL_SIZE,
    minHeight: CELL_SIZE,
    flexShrink: 0,
    borderRadius: 2,
    cursor: "default",
  },
  tooltip: {
    position: "fixed",
    transform: "translate(8px, 8px)",
    pointerEvents: "none",
    zIndex: 10001,
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
    maxWidth: 220,
  },
  tooltipDate: {
    fontWeight: 500,
    marginBottom: "0.25rem",
  },
  tooltipHours: {
    fontWeight: 600,
    opacity: 0.9,
  },
};

export default ActivityHeatmap;
