import {
  HiOutlineCheckCircle,
  HiOutlinePlay,
  HiOutlineXCircle
} from "react-icons/hi2"

import { Badge, Button, Card, Input, Label } from "../../../ui"
import {
  SOURCE_OPTIONS,
  type FilterWorkbenchTestInput,
  type FilterWorkbenchTestResult
} from "./filter-workbench"

type FilterWorkbenchTestBenchProps = {
  value: FilterWorkbenchTestInput
  result: FilterWorkbenchTestResult | null
  onChange: (value: FilterWorkbenchTestInput) => void
  onRun: () => void
}

export function FilterWorkbenchTestBench({
  value,
  result,
  onChange,
  onRun
}: FilterWorkbenchTestBenchProps) {
  return (
    <aside className="space-y-5" data-testid="filters-testbench">
      <Card>
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <HiOutlinePlay className="h-4 w-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-zinc-900">规则测试台</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            输入资源标题和站点信息，预览新页面的测试反馈区域。这里展示的是原型结果，不会调用真实过滤逻辑。
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="filters-test-title">资源标题</Label>
            <Input
              id="filters-test-title"
              value={value.title}
              onChange={(event) =>
                onChange({
                  ...value,
                  title: event.target.value
                })
              }
              placeholder="例如：[SubsPlease] Frieren - 01 (720p) [RAW].mkv"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filters-test-source">来源站点</Label>
              <select
                id="filters-test-source"
                value={value.source}
                onChange={(event) =>
                  onChange({
                    ...value,
                    source: event.target.value as FilterWorkbenchTestInput["source"]
                  })
                }
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500">
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filters-test-subgroup">提取字幕组（可选）</Label>
              <Input
                id="filters-test-subgroup"
                value={value.subgroup}
                onChange={(event) =>
                  onChange({
                    ...value,
                    subgroup: event.target.value
                  })
                }
                placeholder="例如：LoliHouse"
              />
            </div>
          </div>

          <Button type="button" className="w-full" onClick={onRun}>
            开始测试
          </Button>

          {result ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-700">最终结果</span>
                {result.state === "result" ? (
                  <div
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                      result.accepted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    ].join(" ")}>
                    {result.accepted ? (
                      <HiOutlineCheckCircle className="h-4 w-4" />
                    ) : (
                      <HiOutlineXCircle className="h-4 w-4" />
                    )}
                    {result.label}
                  </div>
                ) : (
                  <Badge variant="warning">待补充输入</Badge>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-700">
                {result.summary}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{result.note}</p>

              <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  决策路径
                </div>
                {result.trace.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="text-sm leading-6 text-zinc-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          测试用例模板
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                title: "[LoliHouse] 葬送的芙莉莲 - 01 [WebRip 1080p HEVC-10bit AAC].mkv",
                source: "kisssub",
                subgroup: "LoliHouse"
              })
            }>
            优质压制样例
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                title: "[SubsPlease] Frieren - 01 (720p) [RAW].mkv",
                source: "acgrip",
                subgroup: "SubsPlease"
              })
            }>
            劣质生肉样例
          </Button>
        </div>
      </div>
    </aside>
  )
}
