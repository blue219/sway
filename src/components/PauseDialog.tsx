import { Button, Modal } from 'animal-island-ui'

type PauseDialogProps = {
  onEnd: () => void
  onResume: () => void
}

export function PauseDialog({ onEnd, onResume }: PauseDialogProps) {
  return (
    <Modal
      className="pause-dialog animal-cursor--force"
      footer={
        <div className="dialog-actions">
          <Button className="primary-action" htmlType="button" size="large" type="primary" onClick={onResume}>
            Resume movement
          </Button>
          <Button className="secondary-action" htmlType="button" size="large" onClick={onEnd}>
            End this round
          </Button>
        </div>
      }
      maskClosable={false}
      open
      title="Paused"
      typewriter={false}
    >
      <p>Take as long as you need. Your hold timer will stay where it is.</p>
    </Modal>
  )
}
