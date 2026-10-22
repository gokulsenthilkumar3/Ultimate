export function PriceTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-800/50">
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              {Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-4 bg-gray-800 rounded w-20" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
