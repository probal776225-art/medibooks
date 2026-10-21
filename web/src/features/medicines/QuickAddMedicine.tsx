import { refUrl, type RefMedicine } from '../../catalog/import/medexRef'
import { useRefStore } from '../../catalog/refStore'
import { addMedicine } from '../../catalog/store'
import { Modal } from '../../components/ui'
import type { Medicine } from '../../domain/types'
import { useT } from '../../i18n'
import { useToastStore } from '../../stores/toast'
import { MedicineForm } from './MedicineForm'

/**
 * "+ নতুন ওষুধ" dialog — used on the medicine list now and by the sale screen in Phase 4.
 * With `reference`, the form starts from a MedEx-list row and the new medicine remembers its MedEx id and link.
 */
export function QuickAddMedicine({
  initialName,
  reference,
  onClose,
  onAdded,
}: {
  initialName?: string
  reference?: RefMedicine
  onClose: () => void
  onAdded: (m: Medicine) => void
}) {
  const t = useT()
  const showToast = useToastStore((s) => s.show)
  const refMeta = useRefStore((s) => s.meta)
  return (
    <Modal title={t('med.new')} onClose={onClose}>
      <MedicineForm
        initialName={initialName}
        prefill={
          reference && {
            brandName: reference.brandName,
            genericName: reference.genericName,
            strength: reference.strength,
            dosageForm: reference.dosageForm,
            manufacturer: reference.manufacturer,
            sourceUrl: refUrl(reference),
          }
        }
        note={reference ? t('ref.addHint') : undefined}
        submitLabel={t('customer.save')}
        onSubmit={(input) => {
          const m = addMedicine(
            input,
            reference && {
              sourceName: 'medex',
              sourceId: reference.id,
              dosageText: reference.dosageForm,
              sourceUpdatedAt: refMeta?.fileDate ?? null,
              sourceFetchedAt: refMeta?.importedAt ?? null,
              lastImportId: refMeta?.version ?? null,
            },
          )
          showToast('success', 'med.saved')
          onAdded(m)
        }}
        onCancel={onClose}
      />
    </Modal>
  )
}
