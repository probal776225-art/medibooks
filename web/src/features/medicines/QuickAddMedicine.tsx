import { refUrl, type RefMedicine } from '../../catalog/import/medexRef'
import { useRefStore } from '../../catalog/refStore'
import { addMedicine } from '../../catalog/store'
import { Modal } from '../../components/ui'
import type { Medicine } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useIsOwner } from '../../stores/role'
import { useToastStore } from '../../stores/toast'
import { MedicineForm } from './MedicineForm'
import { refPriceText, refSourcePrices } from './refPrice'

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
  const isOwner = useIsOwner()
  const f = useFormat()
  const prices = reference ? refSourcePrices(reference) : undefined
  const priceText = reference ? refPriceText(reference, f.money, t('med.piece'), true) : null
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
            packDescription: reference.packDescription ?? '',
          }
        }
        sourcePrices={prices}
        hidePrices={!isOwner}
        note={
          !isOwner
            ? priceText
              ? t('staff.addMedPriced', { price: priceText })
              : t('staff.addMedNoPrice')
            : reference
              ? priceText
                ? t('ref.addHintPriced', { price: priceText })
                : t('ref.addHint')
              : undefined
        }
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
              prices,
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
