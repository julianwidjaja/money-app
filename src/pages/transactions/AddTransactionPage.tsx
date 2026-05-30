import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransferForm } from '@/components/transactions/TransferForm'

type TxType = 'expense' | 'income' | 'transfer'

export function AddTransactionPage() {
  const [type, setType] = useState<TxType>('expense')
  const navigate = useNavigate()

  function handleSuccess() {
    navigate('/transactions')
  }

  return (
    <div className="space-y-4 py-4">
      <Tabs value={type} onValueChange={(v) => v != null && setType(v as TxType)}>
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">Expense</TabsTrigger>
          <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
          <TabsTrigger value="transfer" className="flex-1">Transfer</TabsTrigger>
        </TabsList>
        <TabsContent value="expense">
          <TransactionForm type="expense" onSuccess={handleSuccess} />
        </TabsContent>
        <TabsContent value="income">
          <TransactionForm type="income" onSuccess={handleSuccess} />
        </TabsContent>
        <TabsContent value="transfer">
          <TransferForm onSuccess={handleSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
